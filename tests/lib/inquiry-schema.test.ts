import { describe, expect, it } from "vitest";

import { inquirySchema } from "@/lib/inquiry-schema";

function validInquiry(overrides: Record<string, unknown> = {}) {
  return {
    name: "Jordan Rivera",
    email: "jordan@acme.com",
    company: "Acme Inc",
    website: "acme.com",
    service: "cold-email-outreach",
    targetMarket: "Mid-market SaaS, US & UK",
    monthlyOutreachVolume: "2000-5000",
    budgetRange: "5k-10k",
    currentOutreachSetup: "One shared inbox, no dedicated infra",
    goals: "Book 15+ qualified sales calls per month by Q4.",
    privacyConsent: true,
    ...overrides,
  };
}

describe("inquirySchema", () => {
  it("accepts a fully valid inquiry", () => {
    const parsed = inquirySchema.safeParse(validInquiry());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.website).toBe("https://acme.com");
      expect(parsed.data.privacyConsent).toBe(true);
    }
  });

  it("allows currentOutreachSetup to be omitted", () => {
    const payload = validInquiry();
    delete (payload as Record<string, unknown>).currentOutreachSetup;
    const parsed = inquirySchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.currentOutreachSetup).toBe("");
    }
  });

  it("rejects an invalid email address", () => {
    const parsed = inquirySchema.safeParse(
      validInquiry({ email: "not-an-email" }),
    );
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.path[0] === "email")).toBe(
        true,
      );
    }
  });

  it.each([
    "name",
    "email",
    "company",
    "website",
    "service",
    "targetMarket",
    "monthlyOutreachVolume",
    "budgetRange",
    "goals",
  ])("rejects a missing required field: %s", (field) => {
    const payload = validInquiry();
    delete (payload as Record<string, unknown>)[field];
    const parsed = inquirySchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });

  it("rejects privacyConsent that is false", () => {
    const parsed = inquirySchema.safeParse(
      validInquiry({ privacyConsent: false }),
    );
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(
        parsed.error.issues.some((issue) => issue.path[0] === "privacyConsent"),
      ).toBe(true);
    }
  });

  it("rejects a missing privacyConsent", () => {
    const payload = validInquiry();
    delete (payload as Record<string, unknown>).privacyConsent;
    const parsed = inquirySchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });

  it("rejects an invalid service value", () => {
    const parsed = inquirySchema.safeParse(
      validInquiry({ service: "not-a-real-service" }),
    );
    expect(parsed.success).toBe(false);
  });
});
