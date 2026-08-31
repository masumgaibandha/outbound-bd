import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";

import { requireUserSession } from "@/lib/api-auth";
import { readPaymentProof } from "@/lib/blob-storage";
import { connectToDatabase } from "@/lib/mongoose";
import { Payment } from "@/lib/models/payment";
import { PaymentAttempt } from "@/lib/models/payment-attempt";

type RouteContext = { params: Promise<{ paymentId: string }> };

// Proof files live in a private-access Blob store — this route is the only
// way to read one, and it re-checks ownership/admin on every request rather
// than ever handing back a directly-fetchable URL. Serves the *current*
// attempt's proof (falling back to the Payment document's own proof for
// pre-migration payments with no attempt row) — see
// /api/payments/[paymentId]/attempts/[attemptId]/proof for a specific
// historical attempt.
export async function GET(request: Request, { params }: RouteContext) {
  const { session, response } = await requireUserSession(request);
  if (response) return response;

  const { paymentId } = await params;
  if (!isValidObjectId(paymentId)) {
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }

  await connectToDatabase();
  const payment = await Payment.findById(paymentId).lean();

  if (!payment || (payment.userId !== session.user.id && session.user.role !== "ADMIN")) {
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }

  const currentAttempt = payment.currentAttemptId
    ? await PaymentAttempt.findById(payment.currentAttemptId).lean()
    : null;
  const proof = currentAttempt ? currentAttempt.proof : payment.proof;

  const result = await readPaymentProof(proof.pathname);
  if (!result || result.statusCode !== 200) {
    return NextResponse.json({ ok: false, message: "Proof file not found." }, { status: 404 });
  }

  return new NextResponse(result.stream, {
    status: 200,
    headers: {
      "Content-Type": proof.contentType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(proof.fileName)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
