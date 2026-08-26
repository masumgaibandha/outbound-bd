import "server-only";

import { Schema, model, models } from "mongoose";

import type { OrderCatalogSnapshot } from "@/lib/pricing-catalog";

/**
 * Full planned order lifecycle. Phase 1 (this build) only ever creates
 * AWAITING_PAYMENT orders and transitions them to CANCELLED — the rest of
 * the enum exists so the schema doesn't need a breaking migration once
 * payments, fulfillment, and refunds are built.
 */
export const ORDER_STATUSES = [
  "AWAITING_PAYMENT", // confirmed, payment not yet collected (Phase 1 default)
  "PAYMENT_PROCESSING", // payment attempt in flight (future: payments)
  "PAID", // payment collected, not yet fulfilled (future: payments)
  "ACTIVE", // recurring plan actively being delivered (future: fulfillment)
  "COMPLETED", // one-time service delivered / recurring plan ended normally
  "CANCELLED", // cancelled before payment/fulfillment, by client or admin
  "PAYMENT_FAILED", // payment attempt failed (future: payments)
  "REFUNDED", // payment refunded after collection (future: payments)
  "EXPIRED", // never paid within the payment window (future: payments)
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

// Only unpaid orders can be self-cancelled by a client. As more statuses
// become reachable (once payments exist) this stays a single source of
// truth for "is this still safe for the client to cancel themselves".
const CANCELLABLE_STATUSES: readonly OrderStatus[] = ["AWAITING_PAYMENT"];

export function isOrderCancellable(status: OrderStatus): boolean {
  return CANCELLABLE_STATUSES.includes(status);
}

export interface OrderDocument {
  orderNumber: string;
  userId: string;
  idempotencyKey: string;
  status: OrderStatus;
  catalog: OrderCatalogSnapshot;
  company: string;
  website: string;
  country: string;
  notes?: string;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const orderCatalogSnapshotSchema = new Schema<OrderCatalogSnapshot>(
  {
    catalogId: { type: String, required: true },
    kind: { type: String, required: true, enum: ["managed-plan", "one-time-offer"] },
    name: { type: String, required: true },
    currency: { type: String, required: true, enum: ["USD"] },
    billingType: { type: String, required: true, enum: ["recurring", "one-time"] },
    setupPriceCents: { type: Number },
    monthlyPriceCents: { type: Number },
    priceCents: { type: Number },
    unit: { type: String },
    scope: {
      campaigns: { type: String },
      leadsIncluded: { type: Number },
      inboxes: { type: String },
    },
  },
  { _id: false },
);

const orderSchema = new Schema<OrderDocument>(
  {
    orderNumber: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    idempotencyKey: { type: String, required: true, unique: true },
    status: {
      type: String,
      required: true,
      enum: ORDER_STATUSES,
      default: "AWAITING_PAYMENT",
    },
    catalog: { type: orderCatalogSnapshotSchema, required: true },
    company: { type: String, required: true, trim: true },
    website: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
    cancelledAt: { type: Date },
  },
  { timestamps: true },
);

orderSchema.index({ userId: 1, createdAt: -1 });

export const Order = models.Order ?? model<OrderDocument>("Order", orderSchema);
