import { z } from "zod";

import { isValidDateOnly } from "@/lib/agency-admin/timezone";

/**
 * Every value here is untrusted request input — a Server Action argument, a
 * URL query param, or a route-handler search param — validated with zod
 * before it ever reaches a MongoDB query or a document write.
 */

const MONGO_OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

export const clientIdSchema = z.string().regex(MONGO_OBJECT_ID_PATTERN, "Invalid client id");

export const CLIENT_PLAN_VALUES = ["LAUNCH", "GROWTH", "SCALE", "CUSTOM"] as const;
export const clientPlanSchema = z.enum(CLIENT_PLAN_VALUES);
export type ClientPlan = (typeof CLIENT_PLAN_VALUES)[number];

export const CLIENT_STATUS_VALUES = ["ACTIVE", "PAUSED", "ENDED"] as const;
export const clientStatusSchema = z.enum(CLIENT_STATUS_VALUES);
export type ClientStatus = (typeof CLIENT_STATUS_VALUES)[number];

const dateOnlySchema = z
  .string()
  .trim()
  .refine(isValidDateOnly, "Enter a valid date (YYYY-MM-DD)");

/**
 * A sanity ceiling, not a business limit — generous enough that no real
 * Outbound BD plan or payment ever approaches it, tight enough to catch a
 * fat-fingered extra digit (e.g. $50,000/mo typed as $5,000,000/mo) before
 * it's saved. $500,000.00 in cents.
 */
export const MAX_MONEY_CENTS = 50_000_000;

/** Positive integer cents, bounded by `MAX_MONEY_CENTS` — the one shared money-amount schema every client/payment amount field uses, so "no floats, sane ceiling" is enforced identically everywhere. */
export const moneyCentsSchema = z
  .number()
  .int("Enter a whole number of cents")
  .positive("Amount must be greater than zero")
  .max(MAX_MONEY_CENTS, "Amount is unrealistically large");

/** Same as `moneyCentsSchema` but allows zero, for `setupAmountCents` — a client can legitimately have been charged nothing to set up. */
export const optionalMoneyCentsSchema = z
  .number()
  .int("Enter a whole number of cents")
  .nonnegative("Amount can't be negative")
  .max(MAX_MONEY_CENTS, "Amount is unrealistically large");

export const billingDayOfMonthSchema = z
  .number()
  .int("Billing day must be a whole number")
  .min(1, "Billing day must be between 1 and 28")
  .max(28, "Billing day must be between 1 and 28");

const MAX_NAME_LENGTH = 200;
const MAX_NOTE_LENGTH = 2000;
const MAX_SEARCH_LENGTH = 200;

export const clientNoteTextSchema = z
  .string()
  .trim()
  .min(1, "Note can't be empty")
  .max(MAX_NOTE_LENGTH, "Note is too long (2000 characters max)");

/**
 * Shared by both client-creation paths (the WON-lead conversion form and
 * the standalone "Add client" form) — `sourceInquiryId` is supplied
 * separately by the caller (bound into the Server Action), never taken
 * from this form input, so a client-side form can never forge which lead
 * it's linked to.
 */
export const createClientInputSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(MAX_NAME_LENGTH, "Name is too long"),
  company: z.string().trim().min(1, "Enter a company or agency name").max(MAX_NAME_LENGTH, "Name is too long"),
  email: z.string().trim().min(1, "Enter an email").pipe(z.email("Enter a valid email address")),
  website: z.string().trim().min(1, "Enter a website").pipe(z.url("Enter a valid website URL")),
  plan: clientPlanSchema,
  monthlyAmountCents: moneyCentsSchema,
  setupAmountCents: optionalMoneyCentsSchema.optional(),
  billingDayOfMonth: billingDayOfMonthSchema,
  startDate: dateOnlySchema,
});

export type CreateClientInput = z.infer<typeof createClientInputSchema>;

/** Everything editable on the client detail page — a superset of `createClientInputSchema` plus `status` and the optional `endDate`. */
export const updateClientInputSchema = createClientInputSchema.extend({
  status: clientStatusSchema,
  endDate: dateOnlySchema.optional(),
});

export type UpdateClientInput = z.infer<typeof updateClientInputSchema>;

export const clientFiltersSchema = z.object({
  status: clientStatusSchema.optional(),
  plan: clientPlanSchema.optional(),
  q: z.string().trim().max(MAX_SEARCH_LENGTH, "Search is too long").optional(),
});

export type ClientFiltersInput = z.infer<typeof clientFiltersSchema>;

export type RawSearchParams = Record<string, string | string[] | undefined>;

/** Same silently-drop-the-invalid-field contract as `parseLeadFilters` in `validation.ts` — a malformed `plan` shouldn't also discard a valid `status` filter. */
export function parseClientFilters(searchParams: RawSearchParams): ClientFiltersInput {
  const pick = (key: string): string | undefined => {
    const value = searchParams[key];
    const single = Array.isArray(value) ? value[0] : value;
    const trimmed = single?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : undefined;
  };

  const filters: ClientFiltersInput = {};

  const status = pick("status");
  if (status && clientStatusSchema.safeParse(status).success) {
    filters.status = status as ClientFiltersInput["status"];
  }

  const plan = pick("plan");
  if (plan && clientPlanSchema.safeParse(plan).success) {
    filters.plan = plan as ClientFiltersInput["plan"];
  }

  const q = pick("q");
  if (q && q.length <= MAX_SEARCH_LENGTH) filters.q = q;

  return filters;
}

const MAX_PAGE = 100_000;

/** Same clamp contract as `masterclass/pagination.ts`'s `parsePageParam` and `validation.ts`'s `parseLeadsPageParam` — always a finite integer `>= 1`. */
export function parseClientsPageParam(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, MAX_PAGE);
}

export const CLIENTS_PAGE_SIZE = 25;
