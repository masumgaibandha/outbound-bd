import { describe, expect, it } from "vitest";

import { nextBillingDateInDhaka } from "@/lib/agency-admin/billing";

describe("nextBillingDateInDhaka", () => {
  it("returns this month's billing date when today's Dhaka day hasn't passed it yet", () => {
    // 2026-09-10T10:00:00Z is 2026-09-10T16:00 in Dhaka.
    const now = new Date("2026-09-10T10:00:00Z");
    expect(nextBillingDateInDhaka(15, now)).toBe("2026-09-15");
  });

  it("returns next month's billing date when today's Dhaka day is exactly the billing day", () => {
    const now = new Date("2026-09-15T10:00:00Z");
    expect(nextBillingDateInDhaka(15, now)).toBe("2026-09-15");
  });

  it("returns next month's billing date when today's Dhaka day has already passed it", () => {
    const now = new Date("2026-09-20T10:00:00Z");
    expect(nextBillingDateInDhaka(15, now)).toBe("2026-10-15");
  });

  it("rolls over the year when the next billing month is January", () => {
    const now = new Date("2026-12-20T10:00:00Z");
    expect(nextBillingDateInDhaka(15, now)).toBe("2027-01-15");
  });

  it("handles billing day 28 in every month, including February", () => {
    const now = new Date("2026-01-29T10:00:00Z");
    expect(nextBillingDateInDhaka(28, now)).toBe("2026-02-28");
  });

  it("handles billing day 1", () => {
    const now = new Date("2026-09-15T10:00:00Z");
    expect(nextBillingDateInDhaka(1, now)).toBe("2026-10-01");
  });
});
