import { z } from "zod";

import { clientIdSchema, moneyCentsSchema } from "@/lib/agency-admin/clients-validation";
import { isValidDateOnly } from "@/lib/agency-admin/timezone";

/**
 * Every value here is untrusted request input — a Server Action argument, a
 * URL query param, or a route-handler search param — validated with zod
 * before it ever reaches a MongoDB query or a document write.
 */

const MONGO_OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

export const paymentIdSchema = z.string().regex(MONGO_OBJECT_ID_PATTERN, "Invalid payment id");

export const PAYMENT_METHOD_VALUES = ["WISE", "PAYONEER", "BANK", "STRIPE", "OTHER"] as const;
export const paymentMethodSchema = z.enum(PAYMENT_METHOD_VALUES);

export const PAYMENT_TYPE_VALUES = ["SETUP", "MONTHLY", "OTHER"] as const;
export const paymentTypeSchema = z.enum(PAYMENT_TYPE_VALUES);

const dateOnlySchema = z
  .string()
  .trim()
  .refine(isValidDateOnly, "Enter a valid date (YYYY-MM-DD)");

const MAX_REFERENCE_LENGTH = 200;
const MAX_NOTE_LENGTH = 1000;

/** `clientId` is supplied separately by the caller (bound into the Server Action from the page's own route param), never taken from this form input. */
export const createPaymentInputSchema = z.object({
  amountCents: moneyCentsSchema,
  paidAt: dateOnlySchema,
  method: paymentMethodSchema,
  type: paymentTypeSchema,
  reference: z.string().trim().max(MAX_REFERENCE_LENGTH, "Reference is too long").optional(),
  note: z.string().trim().max(MAX_NOTE_LENGTH, "Note is too long").optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentInputSchema>;

export const updatePaymentInputSchema = createPaymentInputSchema;
export type UpdatePaymentInput = z.infer<typeof updatePaymentInputSchema>;

export const paymentFiltersSchema = z.object({
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
  clientId: clientIdSchema.optional(),
  method: paymentMethodSchema.optional(),
  type: paymentTypeSchema.optional(),
});

export type PaymentFiltersInput = z.infer<typeof paymentFiltersSchema>;

export type RawSearchParams = Record<string, string | string[] | undefined>;

/** Same silently-drop-the-invalid-field contract as `parseLeadFilters`/`parseClientFilters`. */
export function parsePaymentFilters(searchParams: RawSearchParams): PaymentFiltersInput {
  const pick = (key: string): string | undefined => {
    const value = searchParams[key];
    const single = Array.isArray(value) ? value[0] : value;
    const trimmed = single?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : undefined;
  };

  const filters: PaymentFiltersInput = {};

  const from = pick("from");
  if (from && isValidDateOnly(from)) filters.from = from;

  const to = pick("to");
  if (to && isValidDateOnly(to)) filters.to = to;

  const clientId = pick("clientId");
  if (clientId && clientIdSchema.safeParse(clientId).success) filters.clientId = clientId;

  const method = pick("method");
  if (method && paymentMethodSchema.safeParse(method).success) {
    filters.method = method as PaymentFiltersInput["method"];
  }

  const type = pick("type");
  if (type && paymentTypeSchema.safeParse(type).success) {
    filters.type = type as PaymentFiltersInput["type"];
  }

  return filters;
}

const MAX_PAGE = 100_000;

/** Same clamp contract as the other admin pagination parsers. */
export function parsePaymentsPageParam(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, MAX_PAGE);
}

export const PAYMENTS_PAGE_SIZE = 25;
