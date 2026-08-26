import { z } from "zod";

import { normalizeWebsite } from "@/lib/normalize-website";

export const orderDetailsSchema = z.object({
  company: z
    .string()
    .trim()
    .min(2, "Enter your company name")
    .max(120, "Company name is too long"),
  website: z
    .string()
    .trim()
    .min(1, "Enter your company website")
    .transform(normalizeWebsite)
    .pipe(z.url("Enter a valid website URL")),
  country: z
    .string()
    .trim()
    .min(2, "Enter your country")
    .max(80, "Country is too long"),
  notes: z
    .string()
    .trim()
    .max(2000, "Please keep this under 2000 characters")
    .optional()
    .or(z.literal("")),
});

export type OrderDetailsInput = z.infer<typeof orderDetailsSchema>;
export type OrderDetailsFieldErrors = Partial<
  Record<keyof OrderDetailsInput, string>
>;

// The full request body sent to POST /api/orders: order details plus the
// catalog id being ordered and a client-generated idempotency key. catalogId
// is validated against the real catalog server-side (see pricing-catalog.ts)
// — it is never trusted for name/price/scope, only used as a lookup key.
export const createOrderRequestSchema = orderDetailsSchema.extend({
  catalogId: z.string().min(1, "Missing catalog item"),
  idempotencyKey: z.uuid("Invalid idempotency key"),
});

export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>;
