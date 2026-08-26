import { z } from "zod";

import { PAYMENT_METHOD_CURRENCIES, PAYMENT_METHOD_TYPES } from "@/lib/models/payment-method";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

// --- Admin: payment method management -------------------------------------

export const paymentMethodDetailsSchema = z
  .record(
    z.string().trim().min(1).max(60),
    z.string().trim().min(1, "Value is required").max(300),
  )
  .refine((details) => Object.keys(details).length > 0, {
    message: "Add at least one beneficiary detail field",
  });

export const paymentMethodInputSchema = z.object({
  type: z.enum(PAYMENT_METHOD_TYPES),
  label: z.string().trim().min(2, "Enter a label").max(120, "Label is too long"),
  currency: z.enum(PAYMENT_METHOD_CURRENCIES),
  beneficiaryName: z
    .string()
    .trim()
    .min(2, "Enter the beneficiary name")
    .max(160, "Beneficiary name is too long"),
  details: paymentMethodDetailsSchema,
  instructions: z
    .string()
    .trim()
    .max(2000, "Please keep this under 2000 characters")
    .optional()
    .or(z.literal("")),
  isActive: z.boolean().optional(),
});

export type PaymentMethodInput = z.infer<typeof paymentMethodInputSchema>;

export const paymentMethodUpdateSchema = paymentMethodInputSchema.partial();
export type PaymentMethodUpdateInput = z.infer<typeof paymentMethodUpdateSchema>;

// --- Client: payment submission --------------------------------------------

// Proof upload constraints, enforced server-side in the submission route.
export const PAYMENT_PROOF_MAX_BYTES = 10 * 1024 * 1024; // 10MB
export const PAYMENT_PROOF_ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
] as const;

const MAX_FUTURE_SKEW_MS = 24 * 60 * 60 * 1000; // tolerate client/server clock drift

export const paymentSubmissionSchema = z.object({
  paymentMethodId: objectIdSchema,
  transactionReference: z
    .string()
    .trim()
    .min(2, "Enter the transaction / reference ID")
    .max(200, "Reference is too long"),
  amountCents: z.coerce
    .number()
    .int("Amount must be a whole number of minor units")
    .positive("Enter the amount you paid"),
  currency: z.enum(PAYMENT_METHOD_CURRENCIES),
  paymentDate: z.coerce
    .date({ error: "Enter a valid payment date" })
    .refine((date) => date.getTime() <= Date.now() + MAX_FUTURE_SKEW_MS, {
      message: "Payment date can't be in the future",
    }),
  notes: z
    .string()
    .trim()
    .max(2000, "Please keep this under 2000 characters")
    .optional()
    .or(z.literal("")),
  idempotencyKey: z.uuid("Invalid idempotency key"),
});

export type PaymentSubmissionInput = z.infer<typeof paymentSubmissionSchema>;
export type PaymentSubmissionFieldErrors = Partial<
  Record<keyof PaymentSubmissionInput, string>
>;

// --- Admin: payment review -------------------------------------------------

export const paymentReviewSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("VERIFY"), reason: z.string().trim().max(2000).optional() }),
  z.object({
    action: z.literal("REJECT"),
    reason: z.string().trim().min(3, "Explain why this payment was rejected").max(2000),
  }),
  z.object({
    action: z.literal("REQUEST_RESUBMISSION"),
    reason: z.string().trim().min(3, "Explain what the client needs to resubmit").max(2000),
  }),
]);

export type PaymentReviewInput = z.infer<typeof paymentReviewSchema>;
