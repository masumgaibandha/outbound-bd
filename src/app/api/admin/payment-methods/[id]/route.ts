import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";

import { requireAdminSession } from "@/lib/api-auth";
import { connectToDatabase } from "@/lib/mongoose";
import { PaymentMethod } from "@/lib/models/payment-method";
import { paymentMethodUpdateSchema } from "@/lib/payment-schema";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const { response } = await requireAdminSession(request);
  if (response) return response;

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ ok: false, message: "Payment method not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request body." }, { status: 400 });
  }

  const parsed = paymentMethodUpdateSchema.safeParse(body);
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

  const update: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) update[key] = value === "" ? undefined : value;
  }

  const method = await PaymentMethod.findByIdAndUpdate(id, update, { new: true });
  if (!method) {
    return NextResponse.json({ ok: false, message: "Payment method not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, method });
}
