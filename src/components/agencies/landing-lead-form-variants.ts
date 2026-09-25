import {
  ACTIVE_CLIENTS_OPTIONS,
  AGENCY_NEED_OPTIONS,
  agencyInquirySchema,
} from "@/lib/agency-inquiry-schema";
import {
  COLD_EMAIL_NEED_OPTIONS,
  TEAM_SIZE_OPTIONS,
  coldEmailInquirySchema,
} from "@/lib/cold-email-inquiry-schema";

/**
 * Everything that differs between the landing-page lead forms. The form
 * component itself (fields, honeypot, submit flow, Lead event) is shared;
 * a page picks its variant by key, since a zod schema can't be passed as a
 * prop from a Server Component page into the client form.
 */

interface FormOption {
  readonly value: string;
  readonly label: string;
}

export interface LandingLeadFormVariant {
  endpoint: string;
  thankYouPath: string;
  schema: typeof agencyInquirySchema | typeof coldEmailInquirySchema;
  emailPlaceholder: string;
  websiteLabel: string;
  websitePlaceholder: string;
  sizeField: {
    name: "activeClients" | "teamSize";
    label: string;
    options: readonly FormOption[];
  };
  needOptions: readonly FormOption[];
}

export const LANDING_LEAD_FORM_VARIANTS = {
  agencies: {
    endpoint: "/api/agencies-lead",
    thankYouPath: "/agencies/thank-you",
    schema: agencyInquirySchema,
    emailPlaceholder: "you@agency.com",
    websiteLabel: "Agency website",
    websitePlaceholder: "youragency.com",
    sizeField: { name: "activeClients", label: "Active clients", options: ACTIVE_CLIENTS_OPTIONS },
    needOptions: AGENCY_NEED_OPTIONS,
  },
  "cold-email": {
    endpoint: "/api/cold-email-lead",
    thankYouPath: "/cold-email/thank-you",
    schema: coldEmailInquirySchema,
    emailPlaceholder: "you@company.com",
    websiteLabel: "Company website",
    websitePlaceholder: "yourcompany.com",
    sizeField: { name: "teamSize", label: "Team size", options: TEAM_SIZE_OPTIONS },
    needOptions: COLD_EMAIL_NEED_OPTIONS,
  },
} satisfies Record<string, LandingLeadFormVariant>;

export type LandingLeadFormVariantKey = keyof typeof LANDING_LEAD_FORM_VARIANTS;
