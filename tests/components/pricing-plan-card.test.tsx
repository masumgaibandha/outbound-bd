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
  campaigns: "1 campaign",
  leadsIncluded: 2500,
  inboxes: "Up to 15 inboxes",
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
