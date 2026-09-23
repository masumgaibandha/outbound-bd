"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { UnauthorizedAgencyAdminError, requireAgencyAdmin } from "@/lib/agency-admin/admin-auth";
import { addLeadNote, changeLeadStatus } from "@/lib/agency-admin/leads-repository";
import { NOT_AUTHORIZED_MESSAGE, ORIGIN_REJECTED_MESSAGE } from "@/lib/agency-admin/messages";
import { expectedOriginFromRequestHeaders } from "@/lib/agency-admin/origin";
import {
  leadIdSchema,
  leadNoteTextSchema,
  leadStatusValueSchema,
} from "@/lib/agency-admin/validation";
import { isRequestSameOrigin } from "@/lib/masterclass/origin-validation";
import type { InquiryStatus } from "@/lib/models/inquiry";

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

type AuthorizeResult = { ok: true } | { ok: false; message: string };

/**
 * Two independent checks, kept distinguishable in the returned message
 * (never by revealing a credential or header value) so a real Basic Auth
 * failure and a same-origin rejection aren't indistinguishable in the UI —
 * that ambiguity is what made the origin-allowlist bug from the last round
 * take longer to isolate than it needed to.
 *
 * The origin check compares the request's `Origin` header against an
 * origin DERIVED from the request itself (`expectedOriginFromRequestHeaders`
 * — `x-forwarded-host`/`host` + `x-forwarded-proto`), not a fixed configured
 * URL — see that function's doc comment for why a fixed URL can never be
 * correct for both Production and every Preview deployment.
 * `isRequestSameOrigin` already rejects (never allows) when the `Origin`
 * header is missing entirely — see its own doc comment.
 */
async function authorizeOrReject(): Promise<AuthorizeResult> {
  try {
    await requireAgencyAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedAgencyAdminError) {
      return { ok: false, message: NOT_AUTHORIZED_MESSAGE };
    }
    throw error;
  }

  const headerList = await headers();
  const expectedOrigin = expectedOriginFromRequestHeaders(headerList);
  if (!expectedOrigin || !isRequestSameOrigin(headerList, [expectedOrigin])) {
    return { ok: false, message: ORIGIN_REJECTED_MESSAGE };
  }

  return { ok: true };
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
  const authorized = await authorizeOrReject();
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
  const authorized = await authorizeOrReject();
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
