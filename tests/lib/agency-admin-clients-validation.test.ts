import { describe, expect, it } from "vitest";

import {
  billingDayOfMonthSchema,
  clientIdSchema,
  createClientInputSchema,
  moneyCentsSchema,
  optionalMoneyCentsSchema,
  parseClientFilters,
  parseClientsPageParam,
  updateClientInputSchema,
} from "@/lib/agency-admin/clients-validation";

describe("clientIdSchema", () => {
  it("accepts a 24-char hex ObjectId string", () => {
    expect(clientIdSchema.safeParse("507f1f77bcf86cd799439011").success).toBe(true);
  });

  it("rejects a malformed id", () => {
    expect(clientIdSchema.safeParse("not-an-id").success).toBe(false);
  });
});

describe("moneyCentsSchema", () => {
  it("accepts a positive integer", () => {
    expect(moneyCentsSchema.safeParse(49900).success).toBe(true);
  });

  it("rejects zero", () => {
    expect(moneyCentsSchema.safeParse(0).success).toBe(false);
  });

  it("rejects a negative amount", () => {
    expect(moneyCentsSchema.safeParse(-100).success).toBe(false);
  });

  it("rejects a non-integer (a leaked float)", () => {
    expect(moneyCentsSchema.safeParse(499.5).success).toBe(false);
  });

  it("rejects an unrealistically large amount", () => {
    expect(moneyCentsSchema.safeParse(100_000_000).success).toBe(false);
  });

  it("rejects NaN", () => {
    expect(moneyCentsSchema.safeParse(NaN).success).toBe(false);
  });
});

describe("optionalMoneyCentsSchema", () => {
  it("accepts zero (a setup fee can legitimately be free)", () => {
    expect(optionalMoneyCentsSchema.safeParse(0).success).toBe(true);
  });

  it("rejects a negative amount", () => {
    expect(optionalMoneyCentsSchema.safeParse(-1).success).toBe(false);
  });
});

describe("billingDayOfMonthSchema", () => {
  it("accepts 1 and 28", () => {
    expect(billingDayOfMonthSchema.safeParse(1).success).toBe(true);
    expect(billingDayOfMonthSchema.safeParse(28).success).toBe(true);
  });

  it("rejects 0 and 29", () => {
    expect(billingDayOfMonthSchema.safeParse(0).success).toBe(false);
    expect(billingDayOfMonthSchema.safeParse(29).success).toBe(false);
  });

  it("rejects a non-integer", () => {
    expect(billingDayOfMonthSchema.safeParse(15.5).success).toBe(false);
  });
});

function validClientInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    name: "Alex Founder",
    company: "Acme Inc",
    email: "alex@acme.com",
    website: "https://acme.com",
    plan: "LAUNCH",
    monthlyAmountCents: 49900,
    billingDayOfMonth: 1,
    startDate: "2026-09-01",
    ...overrides,
  };
}

describe("createClientInputSchema", () => {
  it("accepts a fully valid input", () => {
    expect(createClientInputSchema.safeParse(validClientInput()).success).toBe(true);
  });

  it("accepts an optional setupAmountCents", () => {
    const result = createClientInputSchema.safeParse(validClientInput({ setupAmountCents: 19900 }));
    expect(result.success).toBe(true);
  });

  it("rejects an invalid plan", () => {
    expect(createClientInputSchema.safeParse(validClientInput({ plan: "ENTERPRISE" })).success).toBe(false);
  });

  it("rejects a malformed email", () => {
    expect(createClientInputSchema.safeParse(validClientInput({ email: "not-an-email" })).success).toBe(false);
  });

  it("rejects a malformed website", () => {
    expect(createClientInputSchema.safeParse(validClientInput({ website: "not a url" })).success).toBe(false);
  });

  it("rejects a malformed startDate", () => {
    expect(createClientInputSchema.safeParse(validClientInput({ startDate: "09/01/2026" })).success).toBe(false);
  });
});

describe("updateClientInputSchema", () => {
  it("requires status and accepts everything createClientInputSchema does, plus endDate", () => {
    const result = updateClientInputSchema.safeParse({
      ...validClientInput(),
      status: "ACTIVE",
      endDate: "2027-01-01",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing status", () => {
    expect(updateClientInputSchema.safeParse(validClientInput()).success).toBe(false);
  });

  it("rejects an invalid status", () => {
    const result = updateClientInputSchema.safeParse({ ...validClientInput(), status: "CANCELLED" });
    expect(result.success).toBe(false);
  });
});

describe("parseClientFilters", () => {
  it("returns an empty object when nothing is given", () => {
    expect(parseClientFilters({})).toEqual({});
  });

  it("accepts valid status/plan/q", () => {
    expect(parseClientFilters({ status: "ACTIVE", plan: "GROWTH", q: "acme" })).toEqual({
      status: "ACTIVE",
      plan: "GROWTH",
      q: "acme",
    });
  });

  it("drops an individually invalid field without discarding the rest", () => {
    expect(parseClientFilters({ status: "NOT_A_STATUS", plan: "GROWTH" })).toEqual({ plan: "GROWTH" });
  });
});

describe("parseClientsPageParam", () => {
  it("defaults to 1 for missing/invalid input", () => {
    expect(parseClientsPageParam(undefined)).toBe(1);
    expect(parseClientsPageParam("abc")).toBe(1);
    expect(parseClientsPageParam("0")).toBe(1);
  });

  it("parses a valid page number", () => {
    expect(parseClientsPageParam("3")).toBe(3);
  });
});
