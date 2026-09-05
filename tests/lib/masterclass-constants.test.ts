import { describe, expect, it } from "vitest";

import * as constants from "@/lib/masterclass/constants";

describe("masterclass pricing", () => {
  it("regular/reference price is ৳2,499 and the current batch price is ৳1,499", () => {
    expect(constants.regularPriceBDT).toBe(2499);
    expect(constants.earlyBirdPriceBDT).toBe(1499);
  });

  it("has no date-based cutoff — earlyBirdEndsAt stays null", () => {
    expect(constants.earlyBirdEndsAt).toBeNull();
  });

  it("resolvePriceBDT() always returns the current-batch price, regardless of how far in the future 'now' is — no automatic price change", () => {
    expect(constants.resolvePriceBDT(new Date())).toBe(1499);
    expect(constants.resolvePriceBDT(new Date("2026-10-24T22:00:00+06:00"))).toBe(1499);
    expect(constants.resolvePriceBDT(new Date("2030-01-01T00:00:00Z"))).toBe(1499);
  });
});

describe("masterclass schedule", () => {
  it("both class days are October 23-24, 2026 at 9:00 PM Asia/Dhaka", () => {
    const dhakaFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
    });

    const day1Parts = Object.fromEntries(
      dhakaFormatter.formatToParts(constants.classDates.day1).map((p) => [p.type, p.value]),
    );
    const day2Parts = Object.fromEntries(
      dhakaFormatter.formatToParts(constants.classDates.day2).map((p) => [p.type, p.value]),
    );

    expect(`${day1Parts.year}-${day1Parts.month}-${day1Parts.day}`).toBe("2026-10-23");
    expect(`${day2Parts.year}-${day2Parts.month}-${day2Parts.day}`).toBe("2026-10-24");
    // Intl's 24h "hour12: false" reports midnight as "24" and otherwise zero-pads — 9 PM is "21".
    expect(day1Parts.hour).toBe("21");
    expect(day2Parts.hour).toBe("21");
  });
});
