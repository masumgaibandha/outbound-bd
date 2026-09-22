import { describe, expect, it } from "vitest";

import { agencyAttributionSchema, agencyInquirySchema } from "@/lib/agency-inquiry-schema";

function validAgencyInquiry(overrides: Record<string, unknown> = {}) {
  return {
    name: "Jordan Rivera",
    email: "jordan@agency.com",
    website: "agency.com",
    activeClients: "6-15",
    need: "white-label",
    budgetRange: "1k-plus",
    privacyConsent: true,
    ...overrides,
  };
}

describe("agencyInquirySchema", () => {
  it("accepts a fully valid submission and normalizes the website", () => {
    const parsed = agencyInquirySchema.safeParse(validAgencyInquiry());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.website).toBe("https://agency.com");
    }
  });

  it("has no company/service/goals/targetMarket fields — those are contact-form only", () => {
    const parsed = agencyInquirySchema.safeParse(
      validAgencyInquiry({ company: "Should Be Ignored", goals: "Should Be Ignored" }),
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).not.toHaveProperty("company");
      expect(parsed.data).not.toHaveProperty("goals");
    }
  });

  it.each(["name", "email", "website", "activeClients", "need", "budgetRange", "privacyConsent"])(
    "rejects a submission missing %s",
    (field) => {
      const payload = validAgencyInquiry();
      delete (payload as Record<string, unknown>)[field];
      const parsed = agencyInquirySchema.safeParse(payload);
      expect(parsed.success).toBe(false);
    },
  );

  it("rejects an invalid email", () => {
    const parsed = agencyInquirySchema.safeParse(validAgencyInquiry({ email: "not-an-email" }));
    expect(parsed.success).toBe(false);
  });

  it("rejects an unrecognized activeClients/need/budgetRange value", () => {
    expect(agencyInquirySchema.safeParse(validAgencyInquiry({ activeClients: "bogus" })).success).toBe(false);
    expect(agencyInquirySchema.safeParse(validAgencyInquiry({ need: "bogus" })).success).toBe(false);
    expect(agencyInquirySchema.safeParse(validAgencyInquiry({ budgetRange: "bogus" })).success).toBe(false);
  });

  it("rejects privacyConsent: false", () => {
    const parsed = agencyInquirySchema.safeParse(validAgencyInquiry({ privacyConsent: false }));
    expect(parsed.success).toBe(false);
  });
});

describe("agencyAttributionSchema", () => {
  it("accepts a fully populated attribution object", () => {
    const parsed = agencyAttributionSchema.safeParse({
      utmSource: "facebook",
      utmMedium: "cpc",
      utmCampaign: "agencies-launch",
      utmContent: "ad-1",
      utmTerm: "cold email",
      fbclid: "abc123",
      landingPath: "/agencies",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts an empty object — every field is optional", () => {
    expect(agencyAttributionSchema.safeParse({}).success).toBe(true);
  });

  it("fails on undefined input — callers (the route handler) treat that failure as 'no attribution', not an error", () => {
    // z.object() requires an object; a caller passing `record.attribution`
    // straight through when the client sent none gets `undefined` here and
    // falls back to storing no attribution at all, exactly as if this had
    // succeeded with `{}` — see src/app/api/agencies-lead/route.ts.
    expect(agencyAttributionSchema.safeParse(undefined).success).toBe(false);
  });

  it("drops unrecognized keys rather than rejecting the whole object", () => {
    const parsed = agencyAttributionSchema.safeParse({ utmSource: "facebook", maliciousKey: "x".repeat(10000) });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).not.toHaveProperty("maliciousKey");
    }
  });

  it("rejects an oversized field instead of silently truncating it", () => {
    const parsed = agencyAttributionSchema.safeParse({ utmCampaign: "x".repeat(1000) });
    expect(parsed.success).toBe(false);
  });
});
