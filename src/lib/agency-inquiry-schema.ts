import { z } from "zod";

import { BUDGET_RANGE_OPTIONS } from "@/lib/inquiry-schema";
import { normalizeWebsite } from "@/lib/normalize-website";

/**
 * Validation for the Round 2 /agencies landing-page form — deliberately a
 * separate schema from `inquirySchema` (the /contact form's), not a shared
 * one with optional branches: the two forms collect genuinely different
 * fields (no "company name" here, no "active clients"/"need" on the contact
 * form), so a shared schema would just be two schemas glued together with
 * every field optional, losing the "this form actually requires this"
 * guarantee either one gives on its own. `budgetRange` is the one field
 * both forms share verbatim — same options list, same semantics — so it's
 * imported from inquiry-schema.ts rather than redefined here.
 */

export const ACTIVE_CLIENTS_OPTIONS = [
  { value: "1-5", label: "1 to 5" },
  { value: "6-15", label: "6 to 15" },
  { value: "16-50", label: "16 to 50" },
  { value: "50-plus", label: "50+" },
] as const;

const ACTIVE_CLIENTS_VALUES = ACTIVE_CLIENTS_OPTIONS.map(
  (option) => option.value,
) as [string, ...string[]];

export const AGENCY_NEED_OPTIONS = [
  { value: "white-label", label: "Cold email for my clients (white-label)" },
  { value: "own-agency", label: "Cold email for my own agency" },
  { value: "not-sure", label: "Not sure yet" },
] as const;

const AGENCY_NEED_VALUES = AGENCY_NEED_OPTIONS.map(
  (option) => option.value,
) as [string, ...string[]];

const BUDGET_RANGE_VALUES = BUDGET_RANGE_OPTIONS.map(
  (option) => option.value,
) as [string, ...string[]];

export const agencyInquirySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter your full name")
    .max(100, "Name is too long"),
  email: z
    .string()
    .trim()
    .min(1, "Enter your work email")
    .pipe(z.email("Enter a valid email address")),
  website: z
    .string()
    .trim()
    .min(1, "Enter your agency website")
    .transform(normalizeWebsite)
    .pipe(z.url("Enter a valid website URL")),
  activeClients: z.enum(ACTIVE_CLIENTS_VALUES, {
    error: "Select how many active clients you run",
  }),
  need: z.enum(AGENCY_NEED_VALUES, {
    error: "Select what you need",
  }),
  budgetRange: z.enum(BUDGET_RANGE_VALUES, {
    error: "Select a budget range",
  }),
  privacyConsent: z.literal(true, {
    error: "You must agree to the Privacy Policy to continue",
  }),
});

export type AgencyInquiryInput = z.infer<typeof agencyInquirySchema>;
export type AgencyInquiryFieldErrors = Partial<Record<keyof AgencyInquiryInput, string>>;

// Same length ceiling masterclass/validation.ts uses for its own attribution
// fields — an independent constant, not imported from there, matching this
// codebase's existing agency/masterclass architectural separation.
const MAX_ATTRIBUTION_FIELD_LENGTH = 512;
const MAX_PATH_FIELD_LENGTH = 512;

/**
 * Always optional and validated separately from the required-field schema
 * above: a malformed/oversized attribution value should never fail the
 * whole submission, only get dropped. See `src/lib/agency-attribution.ts`
 * for how this is captured client-side (first-touch, sessionStorage).
 */
export const agencyAttributionSchema = z.object({
  utmSource: z.string().trim().min(1).max(MAX_ATTRIBUTION_FIELD_LENGTH).optional(),
  utmMedium: z.string().trim().min(1).max(MAX_ATTRIBUTION_FIELD_LENGTH).optional(),
  utmCampaign: z.string().trim().min(1).max(MAX_ATTRIBUTION_FIELD_LENGTH).optional(),
  utmContent: z.string().trim().min(1).max(MAX_ATTRIBUTION_FIELD_LENGTH).optional(),
  utmTerm: z.string().trim().min(1).max(MAX_ATTRIBUTION_FIELD_LENGTH).optional(),
  fbclid: z.string().trim().min(1).max(MAX_ATTRIBUTION_FIELD_LENGTH).optional(),
  landingPath: z.string().trim().min(1).max(MAX_PATH_FIELD_LENGTH).optional(),
});

export type AgencyAttributionInput = z.infer<typeof agencyAttributionSchema>;
