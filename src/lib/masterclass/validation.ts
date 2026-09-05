import { z } from "zod";

/**
 * Server-side validation and normalization for the masterclass registration
 * API. Ported from the MasumDev masterclass source with one deliberate
 * addition: `honeypot` and `startedAt` on `registrationInputSchema`. The
 * source didn't have a server-side honeypot/timing gate on this form —
 * Outbound BD's own `/api/inquiries` route already does (see
 * `src/lib/inquiry-schema.ts` and its route handler), and per this port's
 * instructions the stronger of the two behaviors is preserved. Both fields
 * are optional/lenient here; the route handler is what actually rejects a
 * suspicious submission (silently, as a fake-success, matching the
 * `/api/inquiries` convention) rather than surfacing a validation error a
 * bot could learn from.
 */

const MAX_ATTRIBUTION_FIELD_LENGTH = 512;
const MAX_URL_FIELD_LENGTH = 2048;

/* Plain z.object() strips unrecognized keys by default (no .passthrough()) — that alone satisfies "ignore unknown attribution properties". */
export const attributionInputSchema = z.object({
  utmSource: z.string().trim().min(1).max(MAX_ATTRIBUTION_FIELD_LENGTH).optional(),
  utmMedium: z.string().trim().min(1).max(MAX_ATTRIBUTION_FIELD_LENGTH).optional(),
  utmCampaign: z.string().trim().min(1).max(MAX_ATTRIBUTION_FIELD_LENGTH).optional(),
  utmContent: z.string().trim().min(1).max(MAX_ATTRIBUTION_FIELD_LENGTH).optional(),
  utmTerm: z.string().trim().min(1).max(MAX_ATTRIBUTION_FIELD_LENGTH).optional(),
  fbclid: z.string().trim().min(1).max(MAX_ATTRIBUTION_FIELD_LENGTH).optional(),
  fbp: z.string().trim().min(1).max(MAX_ATTRIBUTION_FIELD_LENGTH).optional(),
  fbc: z.string().trim().min(1).max(MAX_ATTRIBUTION_FIELD_LENGTH).optional(),
  landingPage: z.string().trim().min(1).max(MAX_URL_FIELD_LENGTH).optional(),
  referrer: z.string().trim().min(1).max(MAX_URL_FIELD_LENGTH).optional(),
});

export type AttributionInput = z.infer<typeof attributionInputSchema>;

const BD_MOBILE_LOCAL = /^01[3-9]\d{8}$/;

/**
 * Accepts `01XXXXXXXXX`, `8801XXXXXXXXX`, or `+8801XXXXXXXXX` with only
 * mobile prefixes 013–019. Returns the normalized `+8801XXXXXXXXX` form, or
 * `null` if the input doesn't match any of those shapes.
 */
export function normalizeBangladeshPhone(raw: string): string | null {
  const trimmed = raw.trim().replace(/[\s-]/g, "");

  let local: string;
  if (trimmed.startsWith("+880")) {
    local = `0${trimmed.slice(4)}`;
  } else if (trimmed.startsWith("880")) {
    local = `0${trimmed.slice(3)}`;
  } else {
    local = trimmed;
  }

  if (!BD_MOBILE_LOCAL.test(local)) return null;
  return `+880${local.slice(1)}`;
}

export const registrationInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(80, "Name must be at most 80 characters."),
  email: z
    .string()
    .trim()
    .max(254, "Email is too long.")
    .email("Enter a valid email address."),
  phone: z
    .string()
    .trim()
    .max(20, "Phone number is too long.")
    .refine(
      (value) => normalizeBangladeshPhone(value) !== null,
      "Enter a valid Bangladeshi mobile number.",
    ),
  /* Must be the literal `true` — omitted, `false`, or any other value fails. */
  termsAccepted: z.literal(true, "Terms and privacy acceptance is required."),
  /* Always explicit, always separate from terms acceptance, defaults to false. */
  marketingConsent: z.boolean().default(false),
  /* Cloudflare Turnstile client token — verified server-side via Siteverify, never trusted on its presence alone. */
  turnstileToken: z
    .string()
    .trim()
    .min(1, "Verification token is required.")
    .max(2048, "Verification token is too long."),
  attribution: attributionInputSchema.optional(),
  /*
   * Anti-automation, added in this port (not present in the MasumDev
   * source) — same convention as `/api/inquiries`. `honeypot` must arrive
   * empty; any non-empty value means a bot filled a field real users never
   * see. `startedAt` is a client `Date.now()` timestamp captured on mount;
   * the route rejects (silently, as a fake success) anything submitted
   * faster than a human could plausibly fill the form.
   */
  honeypot: z.string().max(200).optional().default(""),
  startedAt: z.number().optional(),
});

export type RegistrationInput = z.infer<typeof registrationInputSchema>;

export const idempotencyKeySchema = z
  .string()
  .uuid("Idempotency-Key must be a valid UUID.");

const transactionIdSchema = z
  .string()
  .trim()
  .min(4, "Transaction ID looks too short.")
  .max(50, "Transaction ID is too long.");

/**
 * Step 2 of registration, mobile-wallet branch: choosing bKash/Nagad/Rocket
 * and submitting the sender's own number + transaction ID. `amount`/
 * `currency` are deliberately absent from both branches of this union — the
 * server always uses the price already stored on the order at creation time,
 * never a client-submitted figure. Likewise there is no destination-account
 * field anywhere in either branch: the number/bank details a visitor sends
 * *to* always come from `getManualPaymentEnv()` (server-only env), never from
 * this schema.
 */
const mobileWalletPaymentInputSchema = z.object({
  method: z.enum(["BKASH", "NAGAD", "ROCKET"], "Choose a valid payment method."),
  senderNumber: z
    .string()
    .trim()
    .max(20, "Sender number is too long.")
    .refine(
      (value) => normalizeBangladeshPhone(value) !== null,
      "Enter a valid Bangladeshi mobile number.",
    ),
  transactionId: transactionIdSchema,
});

/**
 * Step 2, bank-transfer branch. Deliberately does not require the student's
 * own full bank account number — the existing manual-verification workflow
 * (an operator visually matching the payer name, amount, and reference
 * against their own bank statement) doesn't need it, and asking for it would
 * be sensitive data collected for no verification benefit. `senderBankName`
 * is optional (a student may not know how to phrase it, or the operator may
 * not need it); `payerName` and `transactionId` are the two pieces of
 * evidence that actually make manual reconciliation possible.
 */
const bankPaymentInputSchema = z.object({
  method: z.literal("BANK", "Choose a valid payment method."),
  payerName: z
    .string()
    .trim()
    .min(2, "Enter the name on the sending bank account.")
    .max(120, "Name is too long."),
  senderBankName: z
    .string()
    .trim()
    .max(120, "Bank name is too long.")
    .optional()
    .default(""),
  transactionId: transactionIdSchema,
});

export const manualPaymentInputSchema = z.discriminatedUnion("method", [
  mobileWalletPaymentInputSchema,
  bankPaymentInputSchema,
]);

export type ManualPaymentInput = z.infer<typeof manualPaymentInputSchema>;

/** Generic — never echoes the field's submitted value, only which field and why. */
export interface ValidationFailure {
  field: string;
  message: string;
}

export function toValidationFailures(error: z.ZodError): ValidationFailure[] {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "(root)",
    message: issue.message,
  }));
}
