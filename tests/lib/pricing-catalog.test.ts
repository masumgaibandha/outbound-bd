import { describe, expect, it } from "vitest";

import {
  formatPriceCents,
  getCatalogPrefillNote,
  getStartingMonthlyPriceLabel,
  MANAGED_PLANS,
  type ManagedPlan,
} from "@/lib/pricing-catalog";

describe("MANAGED_PLANS — Round 2 pricing", () => {
  it("has exactly one plan with a null monthlyPriceCents (Contact for price)", () => {
    const nullPricedPlans = MANAGED_PLANS.filter((plan) => plan.monthlyPriceCents === null);
    expect(nullPricedPlans).toHaveLength(1);
    expect(nullPricedPlans[0].id).toBe("scale");
  });

  it("Launch is $499/month and Growth is $999/month", () => {
    const launch = MANAGED_PLANS.find((plan) => plan.id === "launch");
    const growth = MANAGED_PLANS.find((plan) => plan.id === "growth");
    expect(launch?.monthlyPriceCents).toBe(49900);
    expect(growth?.monthlyPriceCents).toBe(99900);
  });
});

describe("getStartingMonthlyPriceLabel", () => {
  it("reads the lowest numeric monthly price, excluding any null (Contact for price) tier", () => {
    expect(getStartingMonthlyPriceLabel()).toBe("$499");
  });
});

describe("getCatalogPrefillNote — null price handling", () => {
  it("renders 'custom pricing' for a plan with monthlyPriceCents: null, instead of throwing or printing 'null'", () => {
    const contactForPricePlan: ManagedPlan = {
      kind: "managed-plan",
      id: "scale",
      name: "Scale",
      monthlyPriceCents: null,
      setupPriceCents: 59900,
      tagline: "For high volume or multiple clients.",
      features: ["10+ domains and 50 to 100+ inboxes, split across Google Workspace and Microsoft 365"],
      relatedServiceSlug: "cold-email-outreach",
    };
    const note = getCatalogPrefillNote(contactForPricePlan);
    expect(note).toContain("custom pricing");
    expect(note).not.toMatch(/null/i);
  });

  it("still renders a normal price description for a numerically-priced plan", () => {
    const launch = MANAGED_PLANS.find((plan) => plan.id === "launch")!;
    const note = getCatalogPrefillNote(launch);
    expect(note).toContain(formatPriceCents(launch.monthlyPriceCents!));
    expect(note).toContain(formatPriceCents(launch.setupPriceCents));
  });
});
