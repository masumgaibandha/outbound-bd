import "server-only";

import { Schema, model, models } from "mongoose";

export type InquiryStatus = "NEW";

/**
 * "contact" is every submission through the original `/contact` form;
 * "agencies-landing" is the Round 2 `/agencies` white-label landing page.
 * Both are stored in this one collection (Round 4's admin lists them
 * together) — `source` is the discriminant a caller filters on. Defaults to
 * "contact" at the schema level, which covers every read through the
 * Mongoose model (a pre-Round-2 document has no `source` field stored at
 * all, and Mongoose applies schema defaults when hydrating a document
 * that's missing a field). That default does NOT cover a raw query filter
 * or a `.lean()` read, which is why `scripts/migrations/0002-backfill-inquiry-source.ts`
 * exists — see that file's doc comment.
 */
export type InquirySource = "contact" | "agencies-landing";

/** First-touch ad/campaign attribution, captured client-side on landing — see src/lib/agency-attribution.ts. Only ever populated for source: "agencies-landing"; a contact-form submission has none of this. */
export interface InquiryAttribution {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  fbclid?: string;
  landingPath?: string;
}

export interface InquiryDocument {
  source: InquirySource;
  name: string;
  email: string;
  /** Contact-form only ("company name"). Absent for an agencies-landing lead. */
  company?: string;
  /** "Company website" for the contact form, "agency website" for the agencies landing form — same field, same normalizeWebsite() handling, either way. */
  website: string;
  /** Contact-form only. */
  service?: string;
  /** Contact-form only. */
  targetMarket?: string;
  /** Contact-form only. */
  monthlyOutreachVolume?: string;
  /** Both forms populate this — option sets differ (see BUDGET_RANGE_OPTIONS vs AGENCY_BUDGET_OPTIONS) but the field/semantics are shared. */
  budgetRange: string;
  /** Contact-form only. */
  currentOutreachSetup?: string;
  /** Contact-form only. */
  goals?: string;
  /** Agencies-landing only: how many active clients the agency runs. */
  activeClients?: string;
  /** Agencies-landing only: white-label for clients, for their own agency, or not sure yet. */
  need?: string;
  attribution?: InquiryAttribution;
  privacyConsent: boolean;
  status: InquiryStatus;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const attributionSchema = new Schema<InquiryAttribution>(
  {
    utmSource: { type: String, trim: true },
    utmMedium: { type: String, trim: true },
    utmCampaign: { type: String, trim: true },
    utmContent: { type: String, trim: true },
    utmTerm: { type: String, trim: true },
    fbclid: { type: String, trim: true },
    landingPath: { type: String, trim: true },
  },
  { _id: false },
);

const inquirySchema = new Schema<InquiryDocument>(
  {
    source: { type: String, required: true, default: "contact" },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    company: { type: String, trim: true },
    website: { type: String, required: true, trim: true },
    service: { type: String },
    targetMarket: { type: String, trim: true },
    monthlyOutreachVolume: { type: String },
    budgetRange: { type: String, required: true },
    currentOutreachSetup: { type: String, trim: true, default: "" },
    goals: { type: String, trim: true },
    activeClients: { type: String },
    need: { type: String },
    attribution: { type: attributionSchema },
    privacyConsent: { type: Boolean, required: true },
    status: { type: String, required: true, default: "NEW" },
    ipAddress: { type: String },
  },
  { timestamps: true },
);

inquirySchema.index({ ipAddress: 1, createdAt: -1 });
// Contact-form duplicate check: same email + company within the window.
inquirySchema.index({ email: 1, company: 1, createdAt: -1 });
// Agencies-landing duplicate check: same email within the window, scoped to
// that source (an agencies lead has no `company` to key on the way the
// contact form's index above does).
inquirySchema.index({ email: 1, source: 1, createdAt: -1 });

export const Inquiry =
  models.Inquiry ?? model<InquiryDocument>("Inquiry", inquirySchema);
