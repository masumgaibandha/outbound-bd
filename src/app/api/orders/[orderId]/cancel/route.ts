import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { isValidObjectId } from "mongoose";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongoose";
import { isOrderCancellable, Order } from "@/lib/models/order";

type RouteContext = { params: Promise<{ orderId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Sign in to manage this order." },
      { status: 401 },
    );
  }

  const { orderId } = await params;
  if (!isValidObjectId(orderId)) {
    return NextResponse.json(
      { ok: false, message: "Order not found." },
      { status: 404 },
    );
  }

  await connectToDatabase();

  const order = await Order.findById(orderId);

  // Ownership is enforced here, not just in the UI: an order that exists
  // but belongs to someone else reports 404, exactly like one that
  // doesn't exist at all — this never confirms or denies another user's
  // order id to an attacker probing ids.
  if (!order || order.userId !== session.user.id) {
    return NextResponse.json(
      { ok: false, message: "Order not found." },
      { status: 404 },
    );
  }

  if (!isOrderCancellable(order.status)) {
    return NextResponse.json(
      {
        ok: false,
        message: "This order can no longer be cancelled.",
      },
      { status: 409 },
    );
  }

  order.status = "CANCELLED";
  order.cancelledAt = new Date();
  await order.save();

  return NextResponse.json({ ok: true, status: order.status });
}
