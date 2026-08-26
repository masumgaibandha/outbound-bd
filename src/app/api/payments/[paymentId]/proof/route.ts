import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";

import { requireUserSession } from "@/lib/api-auth";
import { readPaymentProof } from "@/lib/blob-storage";
import { connectToDatabase } from "@/lib/mongoose";
import { Payment } from "@/lib/models/payment";

type RouteContext = { params: Promise<{ paymentId: string }> };

// Proof files live in a private-access Blob store — this route is the only
// way to read one, and it re-checks ownership/admin on every request rather
// than ever handing back a directly-fetchable URL.
export async function GET(_request: Request, { params }: RouteContext) {
  const { session, response } = await requireUserSession();
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

  const result = await readPaymentProof(payment.proof.pathname);
  if (!result || result.statusCode !== 200) {
    return NextResponse.json({ ok: false, message: "Proof file not found." }, { status: 404 });
  }

  return new NextResponse(result.stream, {
    status: 200,
    headers: {
      "Content-Type": payment.proof.contentType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(payment.proof.fileName)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
