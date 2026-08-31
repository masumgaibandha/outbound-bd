import "server-only";

import { Schema, model, models } from "mongoose";

import type { PaymentMethodCurrency, PaymentMethodSnapshot } from "@/lib/models/payment-method";

/**
 * PENDING_REVIEW: client has submitted, awaiting admin action.
 * VERIFIED: admin confirmed the payment — terminal, order becomes PAID.
 * REJECTED: admin rejected the payment (bad/insufficient proof) — order
 *   returns to AWAITING_PAYMENT so the client can submit a fresh attempt.
 * RESUBMISSION_REQUESTED: admin needs more/different info, not a hard
 *   rejection — order also returns to AWAITING_PAYMENT. Modeled as its own
 *   status (not folded into REJECTED) because the two are distinct admin
 *   actions with distinct audit-trail semantics.
 */
export const PAYMENT_STATUSES = [
  "PENDING_REVIEW",
  "VERIFIED",
  "REJECTED",
  "RESUBMISSION_REQUESTED",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type PaymentHistoryEntry = {
  status: PaymentStatus;
  actorId: string;
  actorRole: "CLIENT" | "ADMIN";
  reason?: string;
  at: Date;
  // Which PaymentAttempt this history entry belongs to. Absent on entries
  // written before the attempt-history migration (Phase 2.1) — those refer
  // to the Payment document itself, which still holds the full submission
  // for that era (see payment-attempt.ts for the backward-compat read path).
  attemptId?: Schema.Types.ObjectId;
};

export type PaymentProof = {
  pathname: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
};

export interface PaymentDocument {
  orderId: Schema.Types.ObjectId;
  userId: string;
  paymentMethodId: Schema.Types.ObjectId;
  paymentMethodSnapshot: PaymentMethodSnapshot;
  transactionReference: string;
  amountCents: number;
  currency: PaymentMethodCurrency;
  paymentDate: Date;
  notes?: string;
  proof: PaymentProof;
  idempotencyKey: string;
  status: PaymentStatus;
  reviewNote?: string;
  reviewedAt?: Date;
  reviewedBy?: string;
  overrideReason?: string;
  history: PaymentHistoryEntry[];
  // Added in Phase 2.1. Points at the latest PaymentAttempt for this order;
  // absent on Payment documents created before the migration (this document
  // itself remains the sole/complete record for those — see
  // payment-attempt.ts). `attemptCount` is 0 for those legacy documents too.
  currentAttemptId?: Schema.Types.ObjectId;
  attemptCount: number;
  expectedAmountCents?: number;
  expectedCurrency?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentMethodSnapshotSchema = new Schema<PaymentMethodSnapshot>(
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

const paymentProofSchema = new Schema<PaymentProof>(
  {
    pathname: { type: String, required: true },
    fileName: { type: String, required: true },
    contentType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
  },
  { _id: false },
);

const paymentHistoryEntrySchema = new Schema<PaymentHistoryEntry>(
  {
    status: { type: String, required: true, enum: PAYMENT_STATUSES },
    actorId: { type: String, required: true },
    actorRole: { type: String, required: true, enum: ["CLIENT", "ADMIN"] },
    reason: { type: String, trim: true },
    at: { type: Date, required: true },
    attemptId: { type: Schema.Types.ObjectId, ref: "PaymentAttempt" },
  },
  { _id: false },
);

const paymentSchema = new Schema<PaymentDocument>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
    userId: { type: String, required: true },
    paymentMethodId: { type: Schema.Types.ObjectId, ref: "PaymentMethod", required: true },
    paymentMethodSnapshot: { type: paymentMethodSnapshotSchema, required: true },
    transactionReference: { type: String, required: true, trim: true },
    amountCents: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true },
    paymentDate: { type: Date, required: true },
    notes: { type: String, trim: true },
    proof: { type: paymentProofSchema, required: true },
    idempotencyKey: { type: String, required: true, unique: true },
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
    history: { type: [paymentHistoryEntrySchema], required: true, default: [] },
    currentAttemptId: { type: Schema.Types.ObjectId, ref: "PaymentAttempt" },
    attemptCount: { type: Number, required: true, default: 0 },
    expectedAmountCents: { type: Number },
    expectedCurrency: { type: String },
  },
  { timestamps: true },
);

paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });

export const Payment = models.Payment ?? model<PaymentDocument>("Payment", paymentSchema);
