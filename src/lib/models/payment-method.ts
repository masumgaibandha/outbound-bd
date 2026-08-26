import "server-only";

import { Schema, model, models } from "mongoose";

import {
  PAYMENT_METHOD_CURRENCIES,
  PAYMENT_METHOD_TYPES,
  type PaymentMethodCurrency,
  type PaymentMethodType,
} from "@/lib/payment-method-constants";

export { PAYMENT_METHOD_CURRENCIES, PAYMENT_METHOD_TYPES };
export type { PaymentMethodCurrency, PaymentMethodType };

export interface PaymentMethodDocument {
  type: PaymentMethodType;
  label: string;
  currency: PaymentMethodCurrency;
  beneficiaryName: string;
  // Flexible key/value beneficiary fields — differ per type (e.g. bank name
  // + account + routing number for bank rails, email for Payoneer/Wise).
  // Never hardcoded in source; admin-entered and stored only in MongoDB.
  details: Record<string, string>;
  instructions?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const paymentMethodSchema = new Schema<PaymentMethodDocument>(
  {
    type: { type: String, required: true, enum: PAYMENT_METHOD_TYPES },
    label: { type: String, required: true, trim: true },
    currency: { type: String, required: true, enum: PAYMENT_METHOD_CURRENCIES },
    beneficiaryName: { type: String, required: true, trim: true },
    details: { type: Schema.Types.Mixed, required: true, default: {} },
    instructions: { type: String, trim: true },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);

paymentMethodSchema.index({ isActive: 1, type: 1 });

export const PaymentMethod =
  models.PaymentMethod ?? model<PaymentMethodDocument>("PaymentMethod", paymentMethodSchema);

/**
 * An immutable, submission-time snapshot of a payment method's identifying
 * details — stored on the Payment document. If an admin later edits or
 * deactivates the method, past submissions still show exactly what the
 * client was shown at the time (same rationale as the order catalog
 * snapshot in pricing-catalog.ts).
 */
export type PaymentMethodSnapshot = {
  paymentMethodId: string;
  type: PaymentMethodType;
  label: string;
  currency: PaymentMethodCurrency;
  beneficiaryName: string;
  details: Record<string, string>;
};

export function buildPaymentMethodSnapshot(
  method: Pick<PaymentMethodDocument, "type" | "label" | "currency" | "beneficiaryName" | "details"> & {
    _id: unknown;
  },
): PaymentMethodSnapshot {
  return {
    paymentMethodId: String(method._id),
    type: method.type,
    label: method.label,
    currency: method.currency,
    beneficiaryName: method.beneficiaryName,
    details: method.details,
  };
}
