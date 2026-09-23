"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { UnauthorizedAgencyAdminError, requireAgencyAdmin } from "@/lib/agency-admin/admin-auth";
import { addLeadNote, changeLeadStatus } from "@/lib/agency-admin/leads-repository";
import {
  leadIdSchema,
  leadNoteTextSchema,
  leadStatusValueSchema,
} from "@/lib/agency-admin/validation";
import { isRequestSameOrigin } from "@/lib/masterclass/origin-validation";
import type { InquiryStatus } from "@/lib/models/inquiry";
import { publicEnv } from "@/lib/public-env";

/*
 * Every action here independently calls `requireAgencyAdmin()` first — same
 * belt-and-suspenders rationale as the masterclass admin's `actions.ts`
 * (see that file's doc comment): a Server Action's POST isn't guaranteed to
 * route through the same path-matched `proxy.ts` that protects a normal
 * page load. Nothing below this check ever runs for an unauthorized caller.
 */

export interface LeadActionResult {
  ok: boolean;
  message: string;
}

async function authorizeOrReject(): Promise<boolean> {
  try {
    await requireAgencyAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedAgencyAdminError) return false;
    throw error;
  }

  const headerList = await headers();
  if (!isRequestSameOrigin(headerList, [publicEnv.NEXT_PUBLIC_APP_URL])) return false;

  return true;
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
  if (!(await authorizeOrReject())) return { ok: false, message: "Not authorized." };

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
  if (!(await authorizeOrReject())) return { ok: false, message: "Not authorized." };

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
