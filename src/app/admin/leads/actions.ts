"use server";

import { revalidatePath } from "next/cache";

import { authorizeAgencyAdminAction } from "@/lib/agency-admin/authorize";
import { addLeadNote, changeLeadStatus } from "@/lib/agency-admin/leads-repository";
import {
  leadIdSchema,
  leadNoteTextSchema,
  leadStatusValueSchema,
} from "@/lib/agency-admin/validation";
import type { InquiryStatus } from "@/lib/models/inquiry";

/*
 * Every action here independently calls `authorizeAgencyAdminAction()`
 * first — same belt-and-suspenders rationale as the masterclass admin's
 * `actions.ts` (see that file's doc comment): a Server Action's POST isn't
 * guaranteed to route through the same path-matched `proxy.ts` that
 * protects a normal page load. Nothing below this check ever runs for an
 * unauthorized caller. See `src/lib/agency-admin/authorize.ts` for the
 * shared implementation (Round 4B: extracted here so clients/payments
 * actions reuse it too, instead of a second copy).
 */

export interface LeadActionResult {
  ok: boolean;
  message: string;
}

/**
 * Signature is `(id, prevState, formData)` — not just `(id, formData)` —
 * specifically so a client component can bind `id` with `.bind(null, id)`
 * and hand the result straight to `useActionState`, which requires an
 * action shaped `(prevState, formData)`. `prevState` itself is unused.
 */
export async function changeStatusAction(
  id: string,
  _prevState: LeadActionResult,
  formData: FormData,
): Promise<LeadActionResult> {
  const authorized = await authorizeAgencyAdminAction();
  if (!authorized.ok) return authorized;

  const idResult = leadIdSchema.safeParse(id);
  if (!idResult.success) return { ok: false, message: "Invalid lead." };

  const statusResult = leadStatusValueSchema.safeParse(formData.get("status"));
  if (!statusResult.success) return { ok: false, message: "Select a valid status." };

  const updated = await changeLeadStatus(idResult.data, statusResult.data as InquiryStatus);
  if (!updated) return { ok: false, message: "Lead not found." };

  revalidatePath(`/admin/leads/${idResult.data}`);
  revalidatePath("/admin/leads");
  revalidatePath("/admin");

  return { ok: true, message: "Status updated." };
}

export async function addNoteAction(
  id: string,
  _prevState: LeadActionResult,
  formData: FormData,
): Promise<LeadActionResult> {
  const authorized = await authorizeAgencyAdminAction();
  if (!authorized.ok) return authorized;

  const idResult = leadIdSchema.safeParse(id);
  if (!idResult.success) return { ok: false, message: "Invalid lead." };

  const textResult = leadNoteTextSchema.safeParse(formData.get("text"));
  if (!textResult.success) {
    return { ok: false, message: textResult.error.issues[0]?.message ?? "Invalid note." };
  }

  const updated = await addLeadNote(idResult.data, textResult.data);
  if (!updated) return { ok: false, message: "Lead not found." };

  revalidatePath(`/admin/leads/${idResult.data}`);

  return { ok: true, message: "Note added." };
}
