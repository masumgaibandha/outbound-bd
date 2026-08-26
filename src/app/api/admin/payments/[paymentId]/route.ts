import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";

import { requireAdminSession } from "@/lib/api-auth";
import { connectToDatabase } from "@/lib/mongoose";
import { Order } from "@/lib/models/order";
import { Payment, type PaymentStatus } from "@/lib/models/payment";
import { paymentReviewSchema } from "@/lib/payment-schema";

type RouteContext = { params: Promise<{ paymentId: string }> };

const ACTION_TO_PAYMENT_STATUS: Record<string, PaymentStatus> = {
  VERIFY: "VERIFIED",
  REJECT: "REJECTED",
  REQUEST_RESUBMISSION: "RESUBMISSION_REQUESTED",
};

export async function POST(request: Request, { params }: RouteContext) {
  const { session, response } = await requireAdminSession();
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

  const newStatus = ACTION_TO_PAYMENT_STATUS[parsed.data.action];

  // Atomic guard: only a currently-PENDING_REVIEW payment can be actioned,
  // and only one review action can win a race against a duplicate click.
  const payment = await Payment.findOneAndUpdate(
    { _id: paymentId, status: "PENDING_REVIEW" },
    {
      $set: {
        status: newStatus,
        reviewNote: parsed.data.reason || undefined,
        reviewedAt: new Date(),
        reviewedBy: session.user.id,
      },
      $push: {
        history: {
          status: newStatus,
          actorId: session.user.id,
          actorRole: "ADMIN",
          reason: parsed.data.reason || undefined,
          at: new Date(),
        },
      },
    },
    { new: true },
  );

  if (!payment) {
    return NextResponse.json(
      { ok: false, message: "This payment has already been reviewed." },
      { status: 409 },
    );
  }

  const orderStatus = newStatus === "VERIFIED" ? "PAID" : "AWAITING_PAYMENT";
  await Order.updateOne({ _id: payment.orderId }, { status: orderStatus });

  return NextResponse.json({ ok: true, status: payment.status, orderStatus });
}
