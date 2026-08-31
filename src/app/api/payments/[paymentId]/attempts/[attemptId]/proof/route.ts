import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";

import { requireUserSession } from "@/lib/api-auth";
import { readPaymentProof } from "@/lib/blob-storage";
import { connectToDatabase } from "@/lib/mongoose";
import { PaymentAttempt } from "@/lib/models/payment-attempt";

type RouteContext = { params: Promise<{ paymentId: string; attemptId: string }> };

// Serves one specific historical payment attempt's proof — same
// private-Blob-store access pattern as /api/payments/[paymentId]/proof
// (ownership/admin re-checked on every request, never a raw fetchable URL),
// but addressable per attempt so a rejected/superseded submission's proof
// stays reachable instead of being lost when the client resubmits.
export async function GET(request: Request, { params }: RouteContext) {
  const { session, response } = await requireUserSession(request);
  if (response) return response;

  const { paymentId, attemptId } = await params;
  if (!isValidObjectId(paymentId) || !isValidObjectId(attemptId)) {
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }

  await connectToDatabase();
  const attempt = await PaymentAttempt.findOne({ _id: attemptId, paymentId }).lean();

  if (!attempt || (attempt.userId !== session.user.id && session.user.role !== "ADMIN")) {
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }

  const result = await readPaymentProof(attempt.proof.pathname);
  if (!result || result.statusCode !== 200) {
    return NextResponse.json({ ok: false, message: "Proof file not found." }, { status: 404 });
  }

  return new NextResponse(result.stream, {
    status: 200,
    headers: {
      "Content-Type": attempt.proof.contentType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(attempt.proof.fileName)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
