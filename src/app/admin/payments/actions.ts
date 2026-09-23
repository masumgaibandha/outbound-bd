"use server";

import { revalidatePath } from "next/cache";

import { authorizeAgencyAdminAction } from "@/lib/agency-admin/authorize";
import { clientIdSchema } from "@/lib/agency-admin/clients-validation";
import { dollarsStringToCents } from "@/lib/agency-admin/money";
import { createPayment, deletePayment, findPaymentById, updatePayment } from "@/lib/agency-admin/payments-repository";
import {
  createPaymentInputSchema,
  paymentIdSchema,
  updatePaymentInputSchema,
} from "@/lib/agency-admin/payments-validation";

/*
 * Every action here independently calls `authorizeAgencyAdminAction()`
 * first — see `src/lib/agency-admin/authorize.ts`. Nothing below that check
 * ever runs for an unauthorized or cross-origin caller. Delete's UI-level
 * confirmation step lives in the client component that calls
 * `deletePaymentAction` (a native `confirm()` before submitting) — the
 * action itself still independently re-verifies auth/origin regardless of
 * what the UI did or didn't confirm.
 */

export interface PaymentActionResult {
  ok: boolean;
  message: string;
}

/** `amountCents` arrives as a dollars string — see `dollarsStringToCents`'s own doc comment for why this must never be `Number(dollars) * 100`. */
function readPaymentForm(formData: FormData) {
  const referenceRaw = formData.get("reference");
  const noteRaw = formData.get("note");
  const amountRaw = formData.get("amountCents");
  return {
    amountCents: amountRaw === null ? NaN : (dollarsStringToCents(String(amountRaw)) ?? NaN),
    paidAt: formData.get("paidAt"),
    method: formData.get("method"),
    type: formData.get("type"),
    reference: referenceRaw && String(referenceRaw).trim() !== "" ? referenceRaw : undefined,
    note: noteRaw && String(noteRaw).trim() !== "" ? noteRaw : undefined,
  };
}

/** `clientId` is bound by the calling client component (`.bind(null, clientId)`), never read from `formData`. */
export async function createPaymentAction(
  clientId: string,
  _prevState: PaymentActionResult,
  formData: FormData,
): Promise<PaymentActionResult> {
  const authorized = await authorizeAgencyAdminAction();
  if (!authorized.ok) return authorized;

  const clientIdResult = clientIdSchema.safeParse(clientId);
  if (!clientIdResult.success) return { ok: false, message: "Invalid client." };

  const parsed = createPaymentInputSchema.safeParse(readPaymentForm(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please fix the errors below." };
  }

  await createPayment(clientIdResult.data, parsed.data);

  revalidatePath(`/admin/clients/${clientIdResult.data}`);
  revalidatePath("/admin/payments");
  revalidatePath("/admin/clients");
  revalidatePath("/admin");

  return { ok: true, message: "Payment recorded." };
}

export async function updatePaymentAction(
  id: string,
  _prevState: PaymentActionResult,
  formData: FormData,
): Promise<PaymentActionResult> {
  const authorized = await authorizeAgencyAdminAction();
  if (!authorized.ok) return authorized;

  const idResult = paymentIdSchema.safeParse(id);
  if (!idResult.success) return { ok: false, message: "Invalid payment." };

  const parsed = updatePaymentInputSchema.safeParse(readPaymentForm(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please fix the errors below." };
  }

  const existing = await findPaymentById(idResult.data);
  if (!existing) return { ok: false, message: "Payment not found." };

  const updated = await updatePayment(idResult.data, parsed.data);
  if (!updated) return { ok: false, message: "Payment not found." };

  revalidatePath(`/admin/clients/${String(existing.clientId)}`);
  revalidatePath("/admin/payments");
  revalidatePath("/admin");

  return { ok: true, message: "Payment updated." };
}

export async function deletePaymentAction(
  id: string,
  _prevState: PaymentActionResult,
  _formData: FormData,
): Promise<PaymentActionResult> {
  // Both required only to match `useActionState`'s `(prevState, formData)`
  // shape after `.bind(null, id)` — the delete confirmation itself is a
  // native `confirm()` in the calling client component (`PaymentRow`), not
  // anything read from either of these.
  void _prevState;
  void _formData;

  const authorized = await authorizeAgencyAdminAction();
  if (!authorized.ok) return authorized;

  const idResult = paymentIdSchema.safeParse(id);
  if (!idResult.success) return { ok: false, message: "Invalid payment." };

  const existing = await findPaymentById(idResult.data);
  if (!existing) return { ok: false, message: "Payment not found." };

  const deleted = await deletePayment(idResult.data);
  if (!deleted) return { ok: false, message: "Payment not found." };

  revalidatePath(`/admin/clients/${String(existing.clientId)}`);
  revalidatePath("/admin/payments");
  revalidatePath("/admin");

  return { ok: true, message: "Payment deleted." };
}
