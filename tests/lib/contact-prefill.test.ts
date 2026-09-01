import { describe, expect, it } from "vitest";

import { resolveContactPrefill } from "@/lib/contact-prefill";

describe("resolveContactPrefill", () => {
  it("prefills service and goals from a valid plan", () => {
    const result = resolveContactPrefill({ plan: "launch" });
    expect(result.initialService).toBe("cold-email-outreach");
    expect(result.selectedPlanName).toBe("Launch");
    expect(result.initialGoals).toContain("Launch");
  });

  it("prefills service from a valid service param when there's no plan", () => {
    const result = resolveContactPrefill({ service: "lead-generation" });
    expect(result.initialService).toBe("lead-generation");
    expect(result.selectedPlanName).toBeUndefined();
    expect(result.initialGoals).toBeUndefined();
  });

  it("ignores an invalid service param", () => {
    const result = resolveContactPrefill({ service: "not-a-real-service" });
    expect(result.initialService).toBeUndefined();
  });

  it("lets a valid plan's service win over a conflicting service param", () => {
    const result = resolveContactPrefill({
      plan: "leads-1000",
      service: "email-deliverability",
    });
    expect(result.initialService).toBe("lead-generation");
  });

  it("ignores an unknown plan id", () => {
    const result = resolveContactPrefill({ plan: "not-a-real-plan" });
    expect(result.selectedPlanName).toBeUndefined();
    expect(result.initialGoals).toBeUndefined();
  });

  it("returns no prefill values when nothing is passed", () => {
    const result = resolveContactPrefill({});
    expect(result.initialService).toBeUndefined();
    expect(result.initialGoals).toBeUndefined();
    expect(result.selectedPlanName).toBeUndefined();
  });
});
