import { describe, expect, it } from "vitest";

import { getMarketingConsentState } from "@/lib/masterclass/registrations-repository";
import type { ConsentRecord } from "@/types/masterclass-persistence";

function consent(overrides: Partial<ConsentRecord> = {}): ConsentRecord {
  return {
    accepted: true,
    privacyPolicyVersion: "2026-08-18",
    termsVersion: "2026-09-03",
    refundPolicyVersion: "2026-08-09",
    acceptedAt: new Date("2026-01-01T00:00:00Z"),
    marketingConsent: false,
    ...overrides,
  };
}

describe("getMarketingConsentState", () => {
  it("returns true when consent.marketingConsent is true (the checkbox was checked)", () => {
    expect(getMarketingConsentState({ consent: consent({ marketingConsent: true }) })).toBe(true);
  });

  it("returns false when consent.marketingConsent is false (unchecked — the default)", () => {
    expect(getMarketingConsentState({ consent: consent({ marketingConsent: false }) })).toBe(false);
  });

  it("resolves to false, never throws, for a legacy shape entirely missing the consent field", () => {
    expect(getMarketingConsentState({ consent: undefined as unknown as ConsentRecord })).toBe(false);
  });
});
