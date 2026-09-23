import "server-only";

import { Schema, model, models, type Types } from "mongoose";

/**
 * The agency admin's paying-client pipeline (Round 4B, `/admin/clients`).
 * Deliberately a separate model from `Inquiry` — a lead and a client are
 * different lifecycles (a lead can be WON without ever becoming a client
 * record here, e.g. still being scoped; a client can exist with no lead at
 * all, e.g. a referral — see `sourceInquiryId` below).
 */
export type ClientPlan = "LAUNCH" | "GROWTH" | "SCALE" | "CUSTOM";

export type ClientStatus = "ACTIVE" | "PAUSED" | "ENDED";

/** Append-only private admin note — same shape as `InquiryNote`, no edit/delete in this round. */
export interface ClientNote {
  text: string;
  createdAt: Date;
}

export interface ClientDocument {
  name: string;
  company: string;
  email: string;
  website: string;
  /**
   * `null` for a client added standalone via "Add client" on
   * `/admin/clients` (referral, LinkedIn, cold outreach, etc.) — only set
   * when the client was created by converting a WON lead. A unique index
   * below (partial, only when this field is present) enforces "never a
   * second client for the same lead" at the database level, not just in
   * `createClientFromLead()`'s own check.
   */
  sourceInquiryId?: Types.ObjectId;
  plan: ClientPlan;
  /** The actually agreed price — may differ from `pricing-catalog.ts`'s published figure for `plan`. Integer cents, never a float. */
  monthlyAmountCents: number;
  /** Integer cents, undefined if no separate setup fee was charged. */
  setupAmountCents?: number;
  /** Stored per document even though only "USD" is accepted today, so a future currency never needs a migration to add the field. */
  currency: "USD";
  /** 1 to 28 — capped below 29 so "billing day" is always a real calendar day in every month, including February. */
  billingDayOfMonth: number;
  startDate: Date;
  /** Undefined while the client relationship is ongoing. */
  endDate?: Date;
  status: ClientStatus;
  notes: ClientNote[];
  createdAt: Date;
  updatedAt: Date;
}

const clientNoteSchema = new Schema<ClientNote>(
  {
    text: { type: String, required: true, trim: true },
    createdAt: { type: Date, required: true, default: () => new Date() },
  },
  { _id: false },
);

const clientSchema = new Schema<ClientDocument>(
  {
    name: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    website: { type: String, required: true, trim: true },
    sourceInquiryId: { type: Schema.Types.ObjectId, ref: "Inquiry" },
    plan: { type: String, required: true },
    monthlyAmountCents: { type: Number, required: true },
    setupAmountCents: { type: Number },
    currency: { type: String, required: true, default: "USD" },
    billingDayOfMonth: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    status: { type: String, required: true, default: "ACTIVE" },
    notes: { type: [clientNoteSchema], default: [] },
  },
  { timestamps: true },
);

clientSchema.index({ status: 1, createdAt: -1 });
clientSchema.index({ plan: 1, createdAt: -1 });
clientSchema.index({ createdAt: -1 });
// Enforces "never a duplicate client for the same lead" at the database
// level — see `sourceInquiryId`'s own doc comment. Partial so the many
// standalone clients (no source lead) never collide with each other.
clientSchema.index(
  { sourceInquiryId: 1 },
  { unique: true, name: "uniq_source_inquiry", partialFilterExpression: { sourceInquiryId: { $exists: true } } },
);

export const Client = models.Client ?? model<ClientDocument>("Client", clientSchema);
