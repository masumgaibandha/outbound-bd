import { describe, expect, it } from "vitest";

import { evaluatePaymentMatch, getExpectedInitialPayment, isPaymentMismatch } from "@/lib/payment-match";
import type { OrderCatalogSnapshot } from "@/lib/pricing-catalog";

const recurringCatalog: OrderCatalogSnapshot = {
  catalogId: "launch",
  kind: "managed-plan",
  name: "Launch",
  currency: "USD",
  billingType: "recurring",
  setupPriceCents: 19900,
  monthlyPriceCents: 39900,
  scope: { campaigns: "1 campaign", leadsIncluded: 2500, inboxes: "Up to 15 inboxes" },
};

const oneTimeCatalog: OrderCatalogSnapshot = {
  catalogId: "leads-1000",
  kind: "one-time-offer",
  name: "1,000 Verified Leads",
  currency: "USD",
  billingType: "one-time",
  priceCents: 9900,
  unit: "one-time",
};

describe("getExpectedInitialPayment", () => {
  it("sums setup fee + first month for a recurring plan", () => {
    expect(getExpectedInitialPayment(recurringCatalog)).toEqual({
      amountCents: 19900 + 39900,
      currency: "USD",
    });
  });

  it("uses the flat price for a one-time offer", () => {
    expect(getExpectedInitialPayment(oneTimeCatalog)).toEqual({
      amountCents: 9900,
      currency: "USD",
    });
  });

  it("treats missing setup/monthly cents as zero rather than throwing", () => {
    expect(
      getExpectedInitialPayment({ ...recurringCatalog, setupPriceCents: undefined }),
    ).toEqual({ amountCents: 39900, currency: "USD" });
  });
});

describe("evaluatePaymentMatch", () => {
  const expected = { expectedAmountCents: 59800, expectedCurrency: "USD" };

  it("reports MATCH when amount and currency are exact", () => {
    expect(
      evaluatePaymentMatch({ submittedAmountCents: 59800, submittedCurrency: "USD", ...expected }),
    ).toBe("MATCH");
  });

  it("reports UNDERPAID when the submitted amount is less than expected", () => {
    expect(
      evaluatePaymentMatch({ submittedAmountCents: 50000, submittedCurrency: "USD", ...expected }),
    ).toBe("UNDERPAID");
  });

  it("reports OVERPAID when the submitted amount is more than expected", () => {
    expect(
      evaluatePaymentMatch({ submittedAmountCents: 70000, submittedCurrency: "USD", ...expected }),
    ).toBe("OVERPAID");
  });

  it("reports CURRENCY_MISMATCH without attempting a cross-currency amount comparison", () => {
    // Same numeric cents as expected, but a different currency — this must
    // never be reported as MATCH or as an amount-based result.
    expect(
      evaluatePaymentMatch({ submittedAmountCents: 59800, submittedCurrency: "BDT", ...expected }),
    ).toBe("CURRENCY_MISMATCH");
  });
});

describe("isPaymentMismatch", () => {
  it("is false only for MATCH", () => {
    expect(isPaymentMismatch("MATCH")).toBe(false);
    expect(isPaymentMismatch("UNDERPAID")).toBe(true);
    expect(isPaymentMismatch("OVERPAID")).toBe(true);
    expect(isPaymentMismatch("CURRENCY_MISMATCH")).toBe(true);
  });
});
