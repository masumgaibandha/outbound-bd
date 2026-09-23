"use server";

import { revalidatePath } from "next/cache";

import { authorizeAgencyAdminAction } from "@/lib/agency-admin/authorize";
import {
  addClientNote,
  createClient,
  updateClient,
} from "@/lib/agency-admin/clients-repository";
import {
  clientIdSchema,
  clientNoteTextSchema,
  createClientInputSchema,
  updateClientInputSchema,
} from "@/lib/agency-admin/clients-validation";
import { dollarsStringToCents } from "@/lib/agency-admin/money";
import { leadIdSchema } from "@/lib/agency-admin/validation";

/**
 * `monthlyAmountCents`/`setupAmountCents` arrive from the form as dollars
 * strings — see `dollarsStringToCents`'s own doc comment for why this must
 * never be `Number(dollars) * 100`. `NaN` (an empty/malformed field, or an
 * amount `dollarsStringToCents` rejects) is passed through to the zod
 * schema deliberately — `moneyCentsSchema`/`optionalMoneyCentsSchema`
 * reject a non-integer with their own field-level message, so the error
 * the operator sees is about the amount field specifically.
 */
function readAmountCents(raw: FormDataEntryValue | null): number {
  if (raw === null) return NaN;
  return dollarsStringToCents(String(raw)) ?? NaN;
}

/*
 * Every action here independently calls `authorizeAgencyAdminAction()`
 * first — see `src/lib/agency-admin/authorize.ts` and `leads/actions.ts`'s
 * own doc comment for why. Nothing below that check ever runs for an
 * unauthorized or cross-origin caller.
 */

export interface ClientActionResult {
  ok: boolean;
  message: string;
  clientId?: string;
  /** `true` when `createClientAction` found (rather than created) the client — see `createClient()`'s own doc comment. */
  alreadyExisted?: boolean;
}

function readCreateClientForm(formData: FormData) {
  const setupRaw = formData.get("setupAmountCents");
  return createClientInputSchema.safeParse({
    name: formData.get("name"),
    company: formData.get("company"),
    email: formData.get("email"),
    website: formData.get("website"),
    plan: formData.get("plan"),
    monthlyAmountCents: readAmountCents(formData.get("monthlyAmountCents")),
    setupAmountCents: setupRaw && String(setupRaw).trim() !== "" ? readAmountCents(setupRaw) : undefined,
    billingDayOfMonth: Number(formData.get("billingDayOfMonth")),
    startDate: formData.get("startDate"),
  });
}

/**
 * `sourceInquiryId` is bound by the calling client component
 * (`.bind(null, sourceInquiryId)`), never read from `formData` — this is
 * what stops a client-side form from forging which lead it's linked to.
 * `null` for the standalone "Add client" form; a lead id string for the
 * WON-lead conversion form on that lead's detail page.
 */
export async function createClientAction(
  sourceInquiryId: string | null,
  _prevState: ClientActionResult,
  formData: FormData,
): Promise<ClientActionResult> {
  const authorized = await authorizeAgencyAdminAction();
  if (!authorized.ok) return authorized;

  if (sourceInquiryId !== null) {
    const idResult = leadIdSchema.safeParse(sourceInquiryId);
    if (!idResult.success) return { ok: false, message: "Invalid lead." };
  }

  const parsed = readCreateClientForm(formData);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please fix the errors below." };
  }

  const { client, alreadyExisted } = await createClient(parsed.data, sourceInquiryId);

  revalidatePath("/admin/clients");
  revalidatePath("/admin");
  if (sourceInquiryId) revalidatePath(`/admin/leads/${sourceInquiryId}`);

  return {
    ok: true,
    message: alreadyExisted ? "A client already exists for this lead." : "Client created.",
    clientId: client.id,
    alreadyExisted,
  };
}

export async function updateClientAction(
  id: string,
  _prevState: ClientActionResult,
  formData: FormData,
): Promise<ClientActionResult> {
  const authorized = await authorizeAgencyAdminAction();
  if (!authorized.ok) return authorized;

  const idResult = clientIdSchema.safeParse(id);
  if (!idResult.success) return { ok: false, message: "Invalid client." };

  const setupRaw = formData.get("setupAmountCents");
  const endDateRaw = formData.get("endDate");
  const parsed = updateClientInputSchema.safeParse({
    name: formData.get("name"),
    company: formData.get("company"),
    email: formData.get("email"),
    website: formData.get("website"),
    plan: formData.get("plan"),
    monthlyAmountCents: readAmountCents(formData.get("monthlyAmountCents")),
    setupAmountCents: setupRaw && String(setupRaw).trim() !== "" ? readAmountCents(setupRaw) : undefined,
    billingDayOfMonth: Number(formData.get("billingDayOfMonth")),
    startDate: formData.get("startDate"),
    endDate: endDateRaw && String(endDateRaw).trim() !== "" ? endDateRaw : undefined,
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please fix the errors below." };
  }

  const updated = await updateClient(idResult.data, parsed.data);
  if (!updated) return { ok: false, message: "Client not found." };

  revalidatePath(`/admin/clients/${idResult.data}`);
  revalidatePath("/admin/clients");
  revalidatePath("/admin");

  return { ok: true, message: "Client updated." };
}

export async function addClientNoteAction(
  id: string,
  _prevState: ClientActionResult,
  formData: FormData,
): Promise<ClientActionResult> {
  const authorized = await authorizeAgencyAdminAction();
  if (!authorized.ok) return authorized;

  const idResult = clientIdSchema.safeParse(id);
  if (!idResult.success) return { ok: false, message: "Invalid client." };

  const textResult = clientNoteTextSchema.safeParse(formData.get("text"));
  if (!textResult.success) {
    return { ok: false, message: textResult.error.issues[0]?.message ?? "Invalid note." };
  }

  const updated = await addClientNote(idResult.data, textResult.data);
  if (!updated) return { ok: false, message: "Client not found." };

  revalidatePath(`/admin/clients/${idResult.data}`);

  return { ok: true, message: "Note added." };
}
