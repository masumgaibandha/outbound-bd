import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";

import { requireAdminSession } from "@/lib/api-auth";
import { connectToDatabase } from "@/lib/mongoose";
import { Order } from "@/lib/models/order";
import { Payment, type PaymentStatus } from "@/lib/models/payment";
import { PaymentAttempt } from "@/lib/models/payment-attempt";
import { buildCurrentAttemptView } from "@/lib/payment-attempt-view";
import { isPaymentMismatch } from "@/lib/payment-match";
import { MISMATCH_OVERRIDE_MIN_LENGTH, paymentReviewSchema } from "@/lib/payment-schema";

type RouteContext = { params: Promise<{ paymentId: string }> };

const ACTION_TO_PAYMENT_STATUS: Record<string, PaymentStatus> = {
  VERIFY: "VERIFIED",
  REJECT: "REJECTED",
  REQUEST_RESUBMISSION: "RESUBMISSION_REQUESTED",
};

export async function POST(request: Request, { params }: RouteContext) {
  const { session, response } = await requireAdminSession(request);
  if (response) return response;

  const { paymentId } = await params;
  if (!isValidObjectId(paymentId)) {
    return NextResponse.json({ ok: false, message: "Payment not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request body." }, { status: 400 });
  }

  const parsed = paymentReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  await connectToDatabase();

  const payment = await Payment.findById(paymentId).lean();
  if (!payment) {
    return NextResponse.json({ ok: false, message: "Payment not found." }, { status: 404 });
  }

  const order = await Order.findById(payment.orderId).lean();
  if (!order) {
    return NextResponse.json({ ok: false, message: "Order not found." }, { status: 404 });
  }

  // Reviews act on the current attempt when one exists (orders placed after
  // the Phase 2.1 migration); a pre-migration Payment document with no
  // PaymentAttempt row is reviewed directly, exactly as before — see
  // payment-attempt-view.ts for the shared backward-compat read path.
  const currentAttempt = payment.currentAttemptId
    ? await PaymentAttempt.findById(payment.currentAttemptId).lean()
    : null;
  const view = buildCurrentAttemptView(payment, currentAttempt, order.catalog);

  if (view.status !== "PENDING_REVIEW") {
    return NextResponse.json({ ok: false, message: "This payment has already been reviewed." }, { status: 409 });
  }

  const newStatus = ACTION_TO_PAYMENT_STATUS[parsed.data.action];
  const reason = parsed.data.reason;
  const reviewedAt = new Date();

  // Never auto-verify a mismatched payment: verifying one that doesn't
  // match the expected amount/currency requires an explicit, recorded
  // override reason. Reject/resubmission-request already require a reason
  // regardless of match status (enforced by the schema).
  let overrideReason: string | undefined;
  if (parsed.data.action === "VERIFY" && isPaymentMismatch(view.matchResult)) {
    overrideReason = parsed.data.overrideReason?.trim();
    if (!overrideReason || overrideReason.length < MISMATCH_OVERRIDE_MIN_LENGTH) {
      return NextResponse.json(
        {
          ok: false,
          message: `This payment doesn't match the expected amount/currency (${view.matchResult}). Provide an override reason of at least ${MISMATCH_OVERRIDE_MIN_LENGTH} characters to verify it anyway.`,
        },
        { status: 400 },
      );
    }
  }

  // Atomic guard: only a currently-PENDING_REVIEW record can be actioned,
  // and only one review action can win a race against a duplicate click.
  if (view.source === "attempt" && view.attemptId) {
    const reviewedAttempt = await PaymentAttempt.findOneAndUpdate(
      { _id: view.attemptId, status: "PENDING_REVIEW" },
      {
        $set: {
          status: newStatus,
          reviewNote: reason || undefined,
          reviewedAt,
          reviewedBy: session.user.id,
          overrideReason,
        },
      },
      { new: true },
    );
    if (!reviewedAttempt) {
      return NextResponse.json({ ok: false, message: "This payment has already been reviewed." }, { status: 409 });
    }

    await Payment.updateOne(
      { _id: paymentId },
      {
        $set: {
          status: newStatus,
          reviewNote: reason || undefined,
          reviewedAt,
          reviewedBy: session.user.id,
          overrideReason,
        },
        $push: {
          history: {
            status: newStatus,
            actorId: session.user.id,
            actorRole: "ADMIN",
            reason: reason || undefined,
            at: reviewedAt,
            attemptId: reviewedAttempt._id,
          },
        },
      },
    );
  } else {
    const reviewedPayment = await Payment.findOneAndUpdate(
      { _id: paymentId, status: "PENDING_REVIEW" },
      {
        $set: {
          status: newStatus,
          reviewNote: reason || undefined,
          reviewedAt,
          reviewedBy: session.user.id,
          overrideReason,
        },
        $push: {
          history: {
            status: newStatus,
            actorId: session.user.id,
            actorRole: "ADMIN",
            reason: reason || undefined,
            at: reviewedAt,
          },
        },
      },
      { new: true },
    );
    if (!reviewedPayment) {
      return NextResponse.json({ ok: false, message: "This payment has already been reviewed." }, { status: 409 });
    }
  }

  const orderStatus = newStatus === "VERIFIED" ? "PAID" : "AWAITING_PAYMENT";
  await Order.updateOne({ _id: payment.orderId }, { status: orderStatus });

  return NextResponse.json({ ok: true, status: newStatus, orderStatus });
}
