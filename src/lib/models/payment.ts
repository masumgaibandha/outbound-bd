import "server-only";

import { Schema, model, models, type Types } from "mongoose";

/** A manually-recorded payment against a `Client` (Round 4B, `/admin/payments`). Manual entry means typos happen — payments can be edited and deleted, unlike a lead's append-only notes. */
export type PaymentMethod = "WISE" | "PAYONEER" | "BANK" | "STRIPE" | "OTHER";

export type PaymentType = "SETUP" | "MONTHLY" | "OTHER";

export interface PaymentDocument {
  clientId: Types.ObjectId;
  /** Integer cents, never a float — see `src/lib/agency-admin/money.ts`. */
  amountCents: number;
  currency: "USD";
  /** The date the operator says the payment was received, not the record's `createdAt`. */
  paidAt: Date;
  method: PaymentMethod;
  type: PaymentType;
  reference?: string;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<PaymentDocument>(
  {
    clientId: { type: Schema.Types.ObjectId, required: true, ref: "Client" },
    amountCents: { type: Number, required: true },
    currency: { type: String, required: true, default: "USD" },
    paidAt: { type: Date, required: true },
    method: { type: String, required: true },
    type: { type: String, required: true },
    reference: { type: String, trim: true },
    note: { type: String, trim: true },
  },
  { timestamps: true },
);

// Client detail's payment list and total, newest first.
paymentSchema.index({ clientId: 1, paidAt: -1 });
// Dashboard revenue-by-range aggregations and /admin/payments' date filter.
paymentSchema.index({ paidAt: -1 });
paymentSchema.index({ method: 1, paidAt: -1 });
paymentSchema.index({ type: 1, paidAt: -1 });

export const Payment = models.Payment ?? model<PaymentDocument>("Payment", paymentSchema);
