import { NextResponse } from "next/server";

import { requireUserSession } from "@/lib/api-auth";
import { connectToDatabase } from "@/lib/mongoose";
import { PaymentMethod } from "@/lib/models/payment-method";

// Active payment methods only — this is what clients pick from when
// submitting a payment. Inactive/retired methods are admin-only (see
// /api/admin/payment-methods).
export async function GET() {
  const { response } = await requireUserSession();
  if (response) return response;

  await connectToDatabase();
  const methods = await PaymentMethod.find({ isActive: true })
    .select("type label currency beneficiaryName details instructions")
    .sort({ type: 1 })
    .lean();

  return NextResponse.json({ ok: true, methods });
}
