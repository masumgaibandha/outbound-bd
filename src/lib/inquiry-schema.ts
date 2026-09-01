import { z } from "zod";

import { SERVICES } from "@/components/public/services-data";
import { normalizeWebsite } from "@/lib/normalize-website";

export const SERVICE_INTEREST_OPTIONS = [
  ...SERVICES.map((service) => ({
    value: service.slug as string,
    label: service.navLabel,
  })),
  { value: "not-sure", label: "Not sure yet / general inquiry" },
] as const;

const SERVICE_INTEREST_VALUES = SERVICE_INTEREST_OPTIONS.map(
  (option) => option.value,
) as [string, ...string[]];

export const BUDGET_RANGE_OPTIONS = [
  { value: "under-2k", label: "Under $2,000 / month" },
  { value: "2k-5k", label: "$2,000 – $5,000 / month" },
  { value: "5k-10k", label: "$5,000 – $10,000 / month" },
  { value: "10k-plus", label: "$10,000+ / month" },
  { value: "not-sure", label: "Not sure yet" },
] as const;

const BUDGET_RANGE_VALUES = BUDGET_RANGE_OPTIONS.map(
  (option) => option.value,
) as [string, ...string[]];

export const OUTREACH_VOLUME_OPTIONS = [
  { value: "under-500", label: "Under 500 / month" },
  { value: "500-2000", label: "500 – 2,000 / month" },
  { value: "2000-5000", label: "2,000 – 5,000 / month" },
  { value: "5000-plus", label: "5,000+ / month" },
  { value: "not-sure", label: "Not sure yet" },
] as const;

const OUTREACH_VOLUME_VALUES = OUTREACH_VOLUME_OPTIONS.map(
  (option) => option.value,
) as [string, ...string[]];

export const inquirySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter your full name")
    .max(100, "Name is too long"),
  email: z
    .string()
    .trim()
    .min(1, "Enter your business email")
    .pipe(z.email("Enter a valid email address")),
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
  service: z.enum(SERVICE_INTEREST_VALUES, {
    error: "Select the service you're interested in",
  }),
  targetMarket: z
    .string()
    .trim()
    .min(2, "Tell us who you're targeting (industry, company size, geography)")
    .max(300, "Please keep this under 300 characters"),
  monthlyOutreachVolume: z.enum(OUTREACH_VOLUME_VALUES, {
    error: "Select your approximate monthly outreach volume",
  }),
  budgetRange: z.enum(BUDGET_RANGE_VALUES, {
    error: "Select a budget range",
  }),
  currentOutreachSetup: z
    .string()
    .trim()
    .max(500, "Please keep this under 500 characters")
    .optional()
    .default(""),
  goals: z
    .string()
    .trim()
    .min(10, "Tell us a bit more about your goals (10+ characters)")
    .max(2000, "Please keep this under 2000 characters"),
  privacyConsent: z.literal(true, {
    error: "You must agree to the Privacy Policy to continue",
  }),
});

export type InquiryInput = z.infer<typeof inquirySchema>;
export type InquiryFieldErrors = Partial<Record<keyof InquiryInput, string>>;
