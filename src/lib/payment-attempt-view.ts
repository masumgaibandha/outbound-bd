import "server-only";

// Normalizes "the payment attempt currently awaiting/under review for an
// order" into one shape, regardless of whether it comes from a real
// PaymentAttempt document (orders placed after the Phase 2.1 migration) or
// is synthesized from a pre-migration Payment document that never got a
// PaymentAttempt row. This is the single place that understands the
// backward-compatibility fallback — every route/page that needs "the
// current attempt" goes through this instead of re-deriving it.
//
// Pre-migration Payment documents are never backfilled in the database
// (see README/migration notes) — they're read compatibly instead, computing
// expected-amount/match on the fly from the order's catalog snapshot, which
// is safe because that computation is a pure function of already-immutable
// data.

import type { PaymentAttemptDocument } from "@/lib/models/payment-attempt";
import type { PaymentDocument, PaymentHistoryEntry } from "@/lib/models/payment";
import { evaluatePaymentMatch, getExpectedInitialPayment, type PaymentMatchResult } from "@/lib/payment-match";
import type { OrderCatalogSnapshot } from "@/lib/pricing-catalog";

type Lean<T> = T & { _id: unknown; createdAt: Date; updatedAt: Date };

export type CurrentAttemptView = {
  source: "attempt" | "legacy-payment";
  attemptId: string | null; // null only for a legacy Payment with no PaymentAttempt row
  attemptNumber: number;
  userId: string;
  paymentMethodSnapshot: PaymentAttemptDocument["paymentMethodSnapshot"];
  transactionReference: string;
  amountCents: number;
  currency: string;
  paymentDate: Date;
  notes?: string;
  proof: PaymentAttemptDocument["proof"];
  status: PaymentAttemptDocument["status"];
  reviewNote?: string;
  reviewedAt?: Date;
  reviewedBy?: string;
  overrideReason?: string;
  expectedAmountCents: number;
  expectedCurrency: string;
  matchResult: PaymentMatchResult;
  createdAt: Date;
};

export function buildCurrentAttemptView(
  payment: Lean<PaymentDocument>,
  currentAttempt: Lean<PaymentAttemptDocument> | null,
  orderCatalog: OrderCatalogSnapshot,
): CurrentAttemptView {
  if (currentAttempt) {
    return {
      source: "attempt",
      attemptId: String(currentAttempt._id),
      attemptNumber: currentAttempt.attemptNumber,
      userId: currentAttempt.userId,
      paymentMethodSnapshot: currentAttempt.paymentMethodSnapshot,
      transactionReference: currentAttempt.transactionReference,
      amountCents: currentAttempt.amountCents,
      currency: currentAttempt.currency,
      paymentDate: currentAttempt.paymentDate,
      notes: currentAttempt.notes,
      proof: currentAttempt.proof,
      status: currentAttempt.status,
      reviewNote: currentAttempt.reviewNote,
      reviewedAt: currentAttempt.reviewedAt,
      reviewedBy: currentAttempt.reviewedBy,
      overrideReason: currentAttempt.overrideReason,
      expectedAmountCents: currentAttempt.expectedAmountCents,
      expectedCurrency: currentAttempt.expectedCurrency,
      matchResult: evaluatePaymentMatch({
        submittedAmountCents: currentAttempt.amountCents,
        submittedCurrency: currentAttempt.currency,
        expectedAmountCents: currentAttempt.expectedAmountCents,
        expectedCurrency: currentAttempt.expectedCurrency,
      }),
      createdAt: currentAttempt.createdAt,
    };
  }

  // Legacy fallback: this Payment predates the attempt-history migration and
  // has no PaymentAttempt row. Treat the Payment document itself as attempt 1.
  const expected = getExpectedInitialPayment(orderCatalog);
  return {
    source: "legacy-payment",
    attemptId: null,
    attemptNumber: 1,
    userId: payment.userId,
    paymentMethodSnapshot: payment.paymentMethodSnapshot,
    transactionReference: payment.transactionReference,
    amountCents: payment.amountCents,
    currency: payment.currency,
    paymentDate: payment.paymentDate,
    notes: payment.notes,
    proof: payment.proof,
    status: payment.status,
    reviewNote: payment.reviewNote,
    reviewedAt: payment.reviewedAt,
    reviewedBy: payment.reviewedBy,
    overrideReason: payment.overrideReason,
    expectedAmountCents: payment.expectedAmountCents ?? expected.amountCents,
    expectedCurrency: payment.expectedCurrency ?? expected.currency,
    matchResult: evaluatePaymentMatch({
      submittedAmountCents: payment.amountCents,
      submittedCurrency: payment.currency,
      expectedAmountCents: payment.expectedAmountCents ?? expected.amountCents,
      expectedCurrency: payment.expectedCurrency ?? expected.currency,
    }),
    createdAt: payment.createdAt,
  };
}

export type AttemptHistoryRow = {
  attemptId: string;
  attemptNumber: number;
  amountCents: number;
  currency: string;
  status: PaymentAttemptDocument["status"];
  matchResult: PaymentMatchResult;
  createdAt: Date;
};

export function toAttemptHistoryRow(
  attempt: Lean<PaymentAttemptDocument>,
): AttemptHistoryRow {
  return {
    attemptId: String(attempt._id),
    attemptNumber: attempt.attemptNumber,
    amountCents: attempt.amountCents,
    currency: attempt.currency,
    status: attempt.status,
    matchResult: evaluatePaymentMatch({
      submittedAmountCents: attempt.amountCents,
      submittedCurrency: attempt.currency,
      expectedAmountCents: attempt.expectedAmountCents,
      expectedCurrency: attempt.expectedCurrency,
    }),
    createdAt: attempt.createdAt,
  };
}

export type { PaymentHistoryEntry };
