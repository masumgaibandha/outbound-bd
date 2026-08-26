import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-auth";
import { connectToDatabase } from "@/lib/mongoose";
import { PaymentMethod } from "@/lib/models/payment-method";
import { paymentMethodInputSchema } from "@/lib/payment-schema";

export async function GET() {
  const { response } = await requireAdminSession();
  if (response) return response;

  await connectToDatabase();
  const methods = await PaymentMethod.find().sort({ createdAt: -1 }).lean();

  return NextResponse.json({ ok: true, methods });
}

export async function POST(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request body." }, { status: 400 });
  }

  const parsed = paymentMethodInputSchema.safeParse(body);
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

  await connectToDatabase();
  const method = await PaymentMethod.create({
    type: parsed.data.type,
    label: parsed.data.label,
    currency: parsed.data.currency,
    beneficiaryName: parsed.data.beneficiaryName,
    details: parsed.data.details,
    instructions: parsed.data.instructions || undefined,
    isActive: parsed.data.isActive ?? true,
  });

  return NextResponse.json({ ok: true, methodId: String(method._id) }, { status: 201 });
}
