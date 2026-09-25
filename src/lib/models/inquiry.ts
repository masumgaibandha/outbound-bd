import "server-only";

import { Schema, model, models } from "mongoose";

/**
 * The agency admin pipeline (Round 4A, `/admin/leads`). Every document
 * created before this pipeline existed stored the literal string "NEW" and
 * keeps working unchanged — this is a superset of the old single-value type,
 * not a migration.
 */
export type InquiryStatus =
  | "NEW"
  | "CONTACTED"
  | "CALL_BOOKED"
  | "PROPOSAL_SENT"
  | "WON"
  | "LOST";

/**
 * "contact" is every submission through the original `/contact` form;
 * "agencies-landing" is the Round 2 `/agencies` white-label landing page;
 * "cold-email-landing" is the `/cold-email` landing page for B2B founders.
 * All are stored in this one collection (Round 4's admin lists them
 * together) — `source` is the discriminant a caller filters on. Defaults to
 * "contact" at the schema level, which covers every read through the
 * Mongoose model (a pre-Round-2 document has no `source` field stored at
 * all, and Mongoose applies schema defaults when hydrating a document
 * that's missing a field). That default does NOT cover a raw query filter
 * or a `.lean()` read, which is why `scripts/migrations/0002-backfill-inquiry-source.ts`
 * exists — see that file's doc comment.
 */
export type InquirySource = "contact" | "agencies-landing" | "cold-email-landing";

/** First-touch ad/campaign attribution, captured client-side on landing — see src/lib/agency-attribution.ts. Only ever populated for the two landing-page sources; a contact-form submission has none of this. */
export interface InquiryAttribution {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  fbclid?: string;
  landingPath?: string;
}

/** One entry per status transition, oldest first as stored — `/admin/leads` reads them newest-first. Never rewritten or removed once appended. */
export interface InquiryStatusHistoryEntry {
  status: InquiryStatus;
  changedAt: Date;
}

/** Append-only private admin note — no edit/delete in this round (see CLAUDE.md's Round 4A note). */
export interface InquiryNote {
  text: string;
  createdAt: Date;
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
  /** Cold-email-landing only: the business's team size (see TEAM_SIZE_OPTIONS). */
  teamSize?: string;
  /** Both landing forms: agencies-landing uses AGENCY_NEED_OPTIONS, cold-email-landing uses COLD_EMAIL_NEED_OPTIONS. */
  need?: string;
  attribution?: InquiryAttribution;
  privacyConsent: boolean;
  status: InquiryStatus;
  /** Empty for every document created before Round 4A, including legacy ones with no `source` at all — the admin UI shows "No status changes yet" rather than treating that as an error. */
  statusHistory: InquiryStatusHistoryEntry[];
  notes: InquiryNote[];
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

const statusHistorySchema = new Schema<InquiryStatusHistoryEntry>(
  {
    status: { type: String, required: true },
    changedAt: { type: Date, required: true, default: () => new Date() },
  },
  { _id: false },
);

const noteSchema = new Schema<InquiryNote>(
  {
    text: { type: String, required: true, trim: true },
    createdAt: { type: Date, required: true, default: () => new Date() },
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
    teamSize: { type: String },
    need: { type: String },
    attribution: { type: attributionSchema },
    privacyConsent: { type: Boolean, required: true },
    status: { type: String, required: true, default: "NEW" },
    statusHistory: { type: [statusHistorySchema], default: [] },
    notes: { type: [noteSchema], default: [] },
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
// /admin/leads filters (Round 4A).
inquirySchema.index({ createdAt: -1 });
inquirySchema.index({ status: 1, createdAt: -1 });
inquirySchema.index({ source: 1, createdAt: -1 });

export const Inquiry =
  models.Inquiry ?? model<InquiryDocument>("Inquiry", inquirySchema);
