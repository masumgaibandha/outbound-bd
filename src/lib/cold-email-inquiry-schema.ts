import { z } from "zod";

import {
  landingLeadBudgetField,
  landingLeadEmailField,
  landingLeadNameField,
  landingLeadPrivacyConsentField,
  landingLeadWebsiteField,
} from "@/lib/agency-inquiry-schema";

/**
 * Validation for the /cold-email landing-page form (B2B owners and
 * founders). Same fields and rules as `agencyInquirySchema`, except the
 * size question is "Team size" (stored in its own `teamSize` field, never
 * in the agency form's `activeClients`) and the need options are worded
 * for a business rather than an agency.
 */

export const TEAM_SIZE_OPTIONS = [
  { value: "just-me", label: "Just me" },
  { value: "2-10", label: "2 to 10" },
  { value: "11-50", label: "11 to 50" },
  { value: "50-plus", label: "50+" },
] as const;

const TEAM_SIZE_VALUES = TEAM_SIZE_OPTIONS.map((option) => option.value) as [
  string,
  ...string[],
];

export const COLD_EMAIL_NEED_OPTIONS = [
  { value: "more-sales-calls", label: "More sales calls for my business" },
  { value: "offload-outreach", label: "Take outreach off my plate" },
  { value: "not-sure", label: "Not sure yet" },
] as const;

const COLD_EMAIL_NEED_VALUES = COLD_EMAIL_NEED_OPTIONS.map((option) => option.value) as [
  string,
  ...string[],
];

export const coldEmailInquirySchema = z.object({
  name: landingLeadNameField,
  email: landingLeadEmailField,
  website: landingLeadWebsiteField("Enter your company website"),
  teamSize: z.enum(TEAM_SIZE_VALUES, {
    error: "Select your team size",
  }),
  need: z.enum(COLD_EMAIL_NEED_VALUES, {
    error: "Select what you need",
  }),
  budgetRange: landingLeadBudgetField,
  privacyConsent: landingLeadPrivacyConsentField,
});

export type ColdEmailInquiryInput = z.infer<typeof coldEmailInquirySchema>;
