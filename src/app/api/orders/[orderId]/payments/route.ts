import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";

import { requireUserSession } from "@/lib/api-auth";
import { connectToDatabase } from "@/lib/mongoose";
import { deleteOrphanedPaymentProof, uploadPaymentProof } from "@/lib/blob-storage";
import { Order } from "@/lib/models/order";
import { buildPaymentMethodSnapshot, PaymentMethod } from "@/lib/models/payment-method";
import { Payment } from "@/lib/models/payment";
import { PaymentAttempt } from "@/lib/models/payment-attempt";
import { getExpectedInitialPayment } from "@/lib/payment-match";
import {
  PAYMENT_PROOF_ALLOWED_TYPES,
  PAYMENT_PROOF_MAX_BYTES,
  paymentSubmissionSchema,
} from "@/lib/payment-schema";

type RouteContext = { params: Promise<{ orderId: string }> };

function isDuplicateKeyError(
  error: unknown,
): error is { code: number; keyPattern?: Record<string, unknown> } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === 11000
  );
}

export async function POST(request: Request, { params }: RouteContext) {
  const { session, response } = await requireUserSession(request);
  if (response) return response;

  const { orderId } = await params;
  if (!isValidObjectId(orderId)) {
    return NextResponse.json({ ok: false, message: "Order not found." }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request body." }, { status: 400 });
  }

  // Currency is never read from the client — see payment-schema.ts. It's
  // derived below from the selected payment method once it's loaded.
  const parsed = paymentSubmissionSchema.safeParse({
    paymentMethodId: formData.get("paymentMethodId"),
    transactionReference: formData.get("transactionReference"),
    amountCents: formData.get("amountCents"),
    paymentDate: formData.get("paymentDate"),
    notes: formData.get("notes") ?? "",
    idempotencyKey: formData.get("idempotencyKey"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] ??= issue.message;
    }
    return NextResponse.json(
      { ok: false, message: "Please fix the errors below.", fieldErrors },
      { status: 400 },
    );
  }

  const proofFile = formData.get("proof");
  if (!(proofFile instanceof File) || proofFile.size === 0) {
    return NextResponse.json(
      { ok: false, message: "Attach your payment proof.", fieldErrors: { proof: "Attach your payment proof." } },
      { status: 400 },
    );
  }
  if (!PAYMENT_PROOF_ALLOWED_TYPES.includes(proofFile.type as (typeof PAYMENT_PROOF_ALLOWED_TYPES)[number])) {
    return NextResponse.json(
      {
        ok: false,
        message: "Proof must be a PNG, JPEG, WebP, or PDF file.",
        fieldErrors: { proof: "Unsupported file type." },
      },
      { status: 400 },
    );
  }
  if (proofFile.size > PAYMENT_PROOF_MAX_BYTES) {
    return NextResponse.json(
      { ok: false, message: "Proof file is too large (10MB max).", fieldErrors: { proof: "File is too large." } },
      { status: 400 },
    );
  }

  await connectToDatabase();

  // Idempotency: a retried request with the same client-generated key
  // returns the same result instead of erroring or double-processing. Each
  // submission gets its own PaymentAttempt, so the key is checked against
  // attempts, not the order-level Payment summary.
  const existingAttempt = await PaymentAttempt.findOne({ idempotencyKey: parsed.data.idempotencyKey });
  if (existingAttempt) {
    if (String(existingAttempt.orderId) !== orderId || existingAttempt.userId !== session.user.id) {
      return NextResponse.json({ ok: false, message: "This request could not be processed." }, { status: 409 });
    }
    return NextResponse.json(
      {
        ok: true,
        paymentId: String(existingAttempt.paymentId),
        attemptId: String(existingAttempt._id),
        status: existingAttempt.status,
      },
      { status: 200 },
    );
  }

  const order = await Order.findById(orderId);
  // Ownership: an order that exists but belongs to someone else 404s
  // exactly like one that doesn't exist — same convention as /cancel.
  if (!order || order.userId !== session.user.id) {
    return NextResponse.json({ ok: false, message: "Order not found." }, { status: 404 });
  }

  const method = await PaymentMethod.findOne({ _id: parsed.data.paymentMethodId, isActive: true });
  if (!method) {
    return NextResponse.json(
      { ok: false, message: "That payment method is no longer available." },
      { status: 400 },
    );
  }

  // Atomic status flip is the duplicate-submission guard: only one request
  // can win this update per order. A concurrent double-submit, or a submit
  // against an order that's already PAYMENT_PROCESSING/PAID/etc., loses
  // here rather than racing the writes below. This also serializes
  // concurrent submissions for the same order, so the Payment-mirror /
  // PaymentAttempt writes further down never race each other.
  const flipped = await Order.findOneAndUpdate(
    { _id: orderId, userId: session.user.id, status: "AWAITING_PAYMENT" },
    { status: "PAYMENT_PROCESSING" },
  );
  if (!flipped) {
    return NextResponse.json(
      { ok: false, message: "This order is not awaiting payment." },
      { status: 409 },
    );
  }

  // Currency is taken from the payment method the client actually selected
  // — never from the request body — so a submitted currency can never
  // disagree with the method it's claimed to have been paid into.
  const currency = method.currency;
  const expected = getExpectedInitialPayment(order.catalog);
  const snapshot = buildPaymentMethodSnapshot(method);
  const now = new Date();

  let proof: Awaited<ReturnType<typeof uploadPaymentProof>> | null = null;

  try {
    proof = await uploadPaymentProof(orderId, proofFile);

    const paymentDoc = await Payment.findOneAndUpdate(
      { orderId },
      {
        $set: {
          userId: session.user.id,
          paymentMethodId: method._id,
          paymentMethodSnapshot: snapshot,
          transactionReference: parsed.data.transactionReference,
          amountCents: parsed.data.amountCents,
          currency,
          paymentDate: parsed.data.paymentDate,
          notes: parsed.data.notes || undefined,
          proof,
          idempotencyKey: parsed.data.idempotencyKey,
          status: "PENDING_REVIEW",
          expectedAmountCents: expected.amountCents,
          expectedCurrency: expected.currency,
        },
        $unset: { reviewNote: "", reviewedAt: "", reviewedBy: "", overrideReason: "" },
        $setOnInsert: { attemptCount: 0, history: [] },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    const attemptNumber = paymentDoc.attemptCount + 1;

    const attempt = await PaymentAttempt.create({
      orderId,
      paymentId: paymentDoc._id,
      userId: session.user.id,
      attemptNumber,
      paymentMethodId: method._id,
      paymentMethodSnapshot: snapshot,
      transactionReference: parsed.data.transactionReference,
      amountCents: parsed.data.amountCents,
      currency,
      paymentDate: parsed.data.paymentDate,
      notes: parsed.data.notes || undefined,
      proof,
      idempotencyKey: parsed.data.idempotencyKey,
      expectedAmountCents: expected.amountCents,
      expectedCurrency: expected.currency,
      status: "PENDING_REVIEW",
    });

    await Payment.updateOne(
      { _id: paymentDoc._id },
      {
        $set: { currentAttemptId: attempt._id, attemptCount: attemptNumber },
        $push: {
          history: {
            status: "PENDING_REVIEW",
            actorId: session.user.id,
            actorRole: "CLIENT",
            at: now,
            attemptId: attempt._id,
          },
        },
      },
    );

    return NextResponse.json(
      { ok: true, paymentId: String(paymentDoc._id), attemptId: String(attempt._id), status: attempt.status },
      { status: 201 },
    );
  } catch (error) {
    // Keep the order retryable if anything after the status flip failed —
    // otherwise it'd be stuck in PAYMENT_PROCESSING with no attempt record.
    await Order.updateOne(
      { _id: orderId, status: "PAYMENT_PROCESSING" },
      { status: "AWAITING_PAYMENT" },
    );

    // The proof upload itself already succeeded (we only reach here after
    // `proof` is set, or the throw came from a later write) — clean up the
    // orphaned blob rather than leaving an unreferenced file behind. This
    // never deletes anything belonging to a previously *successful* attempt,
    // only the file this request itself just uploaded.
    if (proof) {
      await deleteOrphanedPaymentProof(proof.pathname);
    }

    if (isDuplicateKeyError(error) && error.keyPattern && "idempotencyKey" in error.keyPattern) {
      const raced = await PaymentAttempt.findOne({ idempotencyKey: parsed.data.idempotencyKey });
      if (raced) {
        return NextResponse.json(
          {
            ok: true,
            paymentId: String(raced.paymentId),
            attemptId: String(raced._id),
            status: raced.status,
          },
          { status: 200 },
        );
      }
    }

    return NextResponse.json({ ok: false, message: "Something went wrong. Please try again." }, { status: 500 });
  }
}
