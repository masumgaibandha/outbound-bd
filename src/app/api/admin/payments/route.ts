import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-auth";
import { connectToDatabase } from "@/lib/mongoose";
import { PAYMENT_STATUSES, Payment } from "@/lib/models/payment";

export async function GET(request: Request) {
  const { response } = await requireAdminSession(request);
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const filter: Record<string, unknown> = {};
  if (status && (PAYMENT_STATUSES as readonly string[]).includes(status)) {
    filter.status = status;
  }

  await connectToDatabase();
  const payments = await Payment.find(filter).sort({ createdAt: -1 }).lean();

  return NextResponse.json({ ok: true, payments });
}
