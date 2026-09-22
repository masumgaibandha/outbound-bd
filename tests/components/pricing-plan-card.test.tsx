// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PricingPlanCard } from "@/components/public/pricing-plan-card";
import type { ManagedPlan } from "@/lib/pricing-catalog";

const basePlan: ManagedPlan = {
  kind: "managed-plan",
  id: "launch",
  name: "Launch",
  monthlyPriceCents: 49900,
  setupPriceCents: 19900,
  tagline: "For one offer and one target market.",
  features: [
    "3 sending domains and up to 9 inboxes, fully set up (DNS, SPF, DKIM, DMARC)",
    "Up to 1,500 verified leads per month, matched to your ideal customer",
  ],
  relatedServiceSlug: "cold-email-outreach",
};

describe("PricingPlanCard", () => {
  it("renders the formatted monthly price and setup fee for a numerically-priced plan", () => {
    render(<PricingPlanCard plan={basePlan} />);
    expect(screen.getByText("$499")).toBeInTheDocument();
    expect(screen.getByText("/month")).toBeInTheDocument();
    expect(screen.getByText("+ $199 one-time setup")).toBeInTheDocument();
  });

  it("renders 'Contact for price' and no '/month' or setup line when monthlyPriceCents is null", () => {
    render(<PricingPlanCard plan={{ ...basePlan, id: "scale", monthlyPriceCents: null }} />);
    expect(screen.getByText("Contact for price")).toBeInTheDocument();
    expect(screen.queryByText("/month")).not.toBeInTheDocument();
    expect(screen.queryByText(/one-time setup/)).not.toBeInTheDocument();
    expect(screen.getByText("Custom setup, scoped on a call")).toBeInTheDocument();
  });
});
