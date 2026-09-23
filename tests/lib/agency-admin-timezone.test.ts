import { describe, expect, it } from "vitest";

import {
  defaultDhakaDateRange,
  dhakaDateOnlyToUtcEndExclusive,
  dhakaDateOnlyToUtcStart,
  isValidDateOnly,
  lastNDhakaMonthKeys,
  utcInstantToDhakaDateOnly,
} from "@/lib/agency-admin/timezone";

describe("isValidDateOnly", () => {
  it("accepts a well-formed calendar date", () => {
    expect(isValidDateOnly("2026-09-23")).toBe(true);
  });

  it("rejects a malformed string", () => {
    expect(isValidDateOnly("2026/09/23")).toBe(false);
    expect(isValidDateOnly("not-a-date")).toBe(false);
    expect(isValidDateOnly("")).toBe(false);
  });

  it("rejects an out-of-range calendar date (e.g. Feb 30)", () => {
    expect(isValidDateOnly("2026-02-30")).toBe(false);
  });
});

describe("dhakaDateOnlyToUtcStart / dhakaDateOnlyToUtcEndExclusive", () => {
  it("converts 2026-09-01 00:00 Asia/Dhaka (UTC+6) to 2026-08-31T18:00:00.000Z", () => {
    expect(dhakaDateOnlyToUtcStart("2026-09-01").toISOString()).toBe("2026-08-31T18:00:00.000Z");
  });

  it("the exclusive end of 2026-09-01 is the start of 2026-09-02 in Dhaka", () => {
    expect(dhakaDateOnlyToUtcEndExclusive("2026-09-01").toISOString()).toBe("2026-09-01T18:00:00.000Z");
    expect(dhakaDateOnlyToUtcEndExclusive("2026-09-01").getTime()).toBe(
      dhakaDateOnlyToUtcStart("2026-09-02").getTime(),
    );
  });

  it("a single-day range [from, to) spans exactly 24 hours", () => {
    const start = dhakaDateOnlyToUtcStart("2026-09-15");
    const end = dhakaDateOnlyToUtcEndExclusive("2026-09-15");
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});

describe("utcInstantToDhakaDateOnly", () => {
  it("a UTC instant just before Dhaka midnight rolls over to the next Dhaka calendar day", () => {
    // 2026-09-01T18:00:00.000Z is exactly 2026-09-02T00:00:00 in Dhaka.
    expect(utcInstantToDhakaDateOnly(new Date("2026-09-01T18:00:00.000Z"))).toBe("2026-09-02");
  });

  it("a UTC instant just before that stays on the earlier Dhaka calendar day", () => {
    expect(utcInstantToDhakaDateOnly(new Date("2026-09-01T17:59:59.999Z"))).toBe("2026-09-01");
  });

  it("round-trips with dhakaDateOnlyToUtcStart", () => {
    expect(utcInstantToDhakaDateOnly(dhakaDateOnlyToUtcStart("2026-09-23"))).toBe("2026-09-23");
  });
});

describe("defaultDhakaDateRange", () => {
  it("returns a 30-day inclusive range ending on the given instant's Dhaka calendar date", () => {
    const now = new Date("2026-09-23T10:00:00.000Z"); // 2026-09-23T16:00 Dhaka
    const range = defaultDhakaDateRange(now);
    expect(range.to).toBe("2026-09-23");
    expect(range.from).toBe("2026-08-25");
  });
});

describe("lastNDhakaMonthKeys", () => {
  it("returns the last 6 months ending at the given instant's Dhaka month, oldest first", () => {
    const now = new Date("2026-09-23T10:00:00.000Z"); // Dhaka September
    expect(lastNDhakaMonthKeys(6, now)).toEqual([
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
    ]);
  });

  it("rolls over the year boundary correctly", () => {
    const now = new Date("2026-02-10T10:00:00.000Z"); // Dhaka February
    expect(lastNDhakaMonthKeys(6, now)).toEqual([
      "2025-09",
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });

  it("supports a count of 1 (just the current month)", () => {
    const now = new Date("2026-09-23T10:00:00.000Z");
    expect(lastNDhakaMonthKeys(1, now)).toEqual(["2026-09"]);
  });

  it("uses the Dhaka-shifted month, not the raw UTC month, near a month boundary", () => {
    // 2026-08-31T18:00:00Z is exactly 2026-09-01T00:00 in Dhaka.
    const now = new Date("2026-08-31T18:00:00.000Z");
    expect(lastNDhakaMonthKeys(1, now)).toEqual(["2026-09"]);
  });
});
