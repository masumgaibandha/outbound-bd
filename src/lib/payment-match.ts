// Pure calculation logic for expected-payment validation. No database or
// framework dependency — deliberately easy to unit test and safe to import
// from both server routes and tests.
//
// Business rule: the expected *initial* payment for a recurring plan is
// setup fee + first month's fee (both due up front); for a one-time offer
// it's simply the catalog price. Always computed from the order's immutable
// catalog snapshot (`OrderCatalogSnapshot`) — never from anything supplied
// by the client — so the expectation can't drift from what was actually
// priced at order time, even if the live catalog changes later.

import type { OrderCatalogSnapshot } from "@/lib/pricing-catalog";

export type ExpectedPayment = {
  amountCents: number;
  currency: OrderCatalogSnapshot["currency"];
};

export function getExpectedInitialPayment(
  catalog: Pick<OrderCatalogSnapshot, "billingType" | "currency" | "setupPriceCents" | "monthlyPriceCents" | "priceCents">,
): ExpectedPayment {
  if (catalog.billingType === "recurring") {
    return {
      amountCents: (catalog.setupPriceCents ?? 0) + (catalog.monthlyPriceCents ?? 0),
      currency: catalog.currency,
    };
  }
  return {
    amountCents: catalog.priceCents ?? 0,
    currency: catalog.currency,
  };
}

export const PAYMENT_MATCH_RESULTS = [
  "MATCH",
  "UNDERPAID",
  "OVERPAID",
  "CURRENCY_MISMATCH",
] as const;

export type PaymentMatchResult = (typeof PAYMENT_MATCH_RESULTS)[number];

/**
 * Compares a submitted amount/currency against the expected amount/currency.
 * Currency mismatches are reported as their own result rather than attempting
 * a cross-currency amount comparison — this app has no exchange-rate source,
 * so a direct cents comparison across currencies would be meaningless (and
 * actively misleading to an admin deciding whether to verify a payment).
 */
export function evaluatePaymentMatch(params: {
  submittedAmountCents: number;
  submittedCurrency: string;
  expectedAmountCents: number;
  expectedCurrency: string;
}): PaymentMatchResult {
  if (params.submittedCurrency !== params.expectedCurrency) {
    return "CURRENCY_MISMATCH";
  }
  if (params.submittedAmountCents < params.expectedAmountCents) {
    return "UNDERPAID";
  }
  if (params.submittedAmountCents > params.expectedAmountCents) {
    return "OVERPAID";
  }
  return "MATCH";
}

export function isPaymentMismatch(result: PaymentMatchResult): boolean {
  return result !== "MATCH";
}
