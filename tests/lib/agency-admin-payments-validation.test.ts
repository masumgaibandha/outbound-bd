import { describe, expect, it } from "vitest";

import {
  createPaymentInputSchema,
  paymentIdSchema,
  parsePaymentFilters,
  parsePaymentsPageParam,
} from "@/lib/agency-admin/payments-validation";

describe("paymentIdSchema", () => {
  it("accepts a 24-char hex ObjectId string", () => {
    expect(paymentIdSchema.safeParse("507f1f77bcf86cd799439011").success).toBe(true);
  });

  it("rejects a malformed id", () => {
    expect(paymentIdSchema.safeParse("nope").success).toBe(false);
  });
});

function validPaymentInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    amountCents: 49900,
    paidAt: "2026-09-15",
    method: "WISE",
    type: "MONTHLY",
    ...overrides,
  };
}

describe("createPaymentInputSchema", () => {
  it("accepts a fully valid input", () => {
    expect(createPaymentInputSchema.safeParse(validPaymentInput()).success).toBe(true);
  });

  it("accepts optional reference and note", () => {
    const result = createPaymentInputSchema.safeParse(
      validPaymentInput({ reference: "INV-001", note: "Paid via bank transfer" }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects zero or negative amount", () => {
    expect(createPaymentInputSchema.safeParse(validPaymentInput({ amountCents: 0 })).success).toBe(false);
    expect(createPaymentInputSchema.safeParse(validPaymentInput({ amountCents: -100 })).success).toBe(false);
  });

  it("rejects a non-integer amount (a leaked float)", () => {
    expect(createPaymentInputSchema.safeParse(validPaymentInput({ amountCents: 499.5 })).success).toBe(false);
  });

  it("rejects an invalid method", () => {
    expect(createPaymentInputSchema.safeParse(validPaymentInput({ method: "CASH" })).success).toBe(false);
  });

  it("rejects an invalid type", () => {
    expect(createPaymentInputSchema.safeParse(validPaymentInput({ type: "REFUND" })).success).toBe(false);
  });

  it("rejects a malformed paidAt", () => {
    expect(createPaymentInputSchema.safeParse(validPaymentInput({ paidAt: "not-a-date" })).success).toBe(false);
  });
});

describe("parsePaymentFilters", () => {
  it("returns an empty object when nothing is given", () => {
    expect(parsePaymentFilters({})).toEqual({});
  });

  it("accepts valid from/to/method/type", () => {
    expect(
      parsePaymentFilters({ from: "2026-09-01", to: "2026-09-30", method: "STRIPE", type: "SETUP" }),
    ).toEqual({ from: "2026-09-01", to: "2026-09-30", method: "STRIPE", type: "SETUP" });
  });

  it("accepts a valid clientId", () => {
    expect(parsePaymentFilters({ clientId: "507f1f77bcf86cd799439011" })).toEqual({
      clientId: "507f1f77bcf86cd799439011",
    });
  });

  it("drops an individually invalid field without discarding the rest", () => {
    expect(parsePaymentFilters({ method: "CASH", type: "SETUP" })).toEqual({ type: "SETUP" });
    expect(parsePaymentFilters({ clientId: "not-an-id", method: "WISE" })).toEqual({ method: "WISE" });
  });
});

describe("parsePaymentsPageParam", () => {
  it("defaults to 1 for missing/invalid input", () => {
    expect(parsePaymentsPageParam(undefined)).toBe(1);
    expect(parsePaymentsPageParam("abc")).toBe(1);
  });

  it("parses a valid page number", () => {
    expect(parsePaymentsPageParam("2")).toBe(2);
  });
});
