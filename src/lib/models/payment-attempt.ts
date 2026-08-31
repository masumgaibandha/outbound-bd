import "server-only";

import { Schema, model, models } from "mongoose";

import type { PaymentMethodCurrency, PaymentMethodSnapshot } from "@/lib/models/payment-method";
import { PAYMENT_STATUSES, type PaymentStatus } from "@/lib/models/payment";

/**
 * One immutable record per client submission/resubmission. Unlike the
 * parent `Payment` document (a per-order "current status" summary, kept for
 * backward compatibility with existing pages/links), a `PaymentAttempt` is
 * never overwritten once created — a resubmission always inserts a new
 * attempt rather than mutating a prior one, so a rejected attempt's proof,
 * amount, and reference stay permanently retrievable for audit.
 *
 * Only the review fields (status/reviewNote/reviewedAt/reviewedBy/
 * overrideReason) are ever updated after insert, exactly once, guarded by
 * an atomic `status: "PENDING_REVIEW"` filter — the same single-review
 * guarantee the original Payment model used.
 */
export interface PaymentAttemptDocument {
  orderId: Schema.Types.ObjectId;
  paymentId: Schema.Types.ObjectId;
  userId: string;
  attemptNumber: number;
  paymentMethodId: Schema.Types.ObjectId;
  paymentMethodSnapshot: PaymentMethodSnapshot;
  transactionReference: string;
  amountCents: number;
  currency: PaymentMethodCurrency;
  paymentDate: Date;
  notes?: string;
  proof: {
    pathname: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
  };
  idempotencyKey: string;
  // Frozen at submission time from the order's immutable catalog snapshot —
  // never recomputed against a live catalog, so historical attempts keep
  // whatever "expected" meant at the moment they were submitted.
  expectedAmountCents: number;
  expectedCurrency: string;
  status: PaymentStatus;
  reviewNote?: string;
  reviewedAt?: Date;
  reviewedBy?: string;
  // Present only when an admin verified an attempt that didn't match the
  // expected amount/currency — required by the review route in that case.
  overrideReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentMethodSnapshotSchema = new Schema(
  {
    paymentMethodId: { type: String, required: true },
    type: { type: String, required: true },
    label: { type: String, required: true },
    currency: { type: String, required: true },
    beneficiaryName: { type: String, required: true },
    details: { type: Schema.Types.Mixed, required: true, default: {} },
  },
  { _id: false },
);

const paymentProofSchema = new Schema(
  {
    pathname: { type: String, required: true },
    fileName: { type: String, required: true },
    contentType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
  },
  { _id: false },
);

const paymentAttemptSchema = new Schema<PaymentAttemptDocument>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment", required: true },
    userId: { type: String, required: true },
    attemptNumber: { type: Number, required: true, min: 1 },
    paymentMethodId: { type: Schema.Types.ObjectId, ref: "PaymentMethod", required: true },
    paymentMethodSnapshot: { type: paymentMethodSnapshotSchema, required: true },
    transactionReference: { type: String, required: true, trim: true },
    amountCents: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true },
    paymentDate: { type: Date, required: true },
    notes: { type: String, trim: true },
    proof: { type: paymentProofSchema, required: true },
    idempotencyKey: { type: String, required: true, unique: true },
    expectedAmountCents: { type: Number, required: true, min: 0 },
    expectedCurrency: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: PAYMENT_STATUSES,
      default: "PENDING_REVIEW",
    },
    reviewNote: { type: String, trim: true },
    reviewedAt: { type: Date },
    reviewedBy: { type: String },
    overrideReason: { type: String, trim: true },
  },
  { timestamps: true },
);

paymentAttemptSchema.index({ orderId: 1, attemptNumber: 1 }, { unique: true });
paymentAttemptSchema.index({ paymentId: 1, createdAt: -1 });
paymentAttemptSchema.index({ userId: 1, createdAt: -1 });

export const PaymentAttempt =
  models.PaymentAttempt ?? model<PaymentAttemptDocument>("PaymentAttempt", paymentAttemptSchema);
