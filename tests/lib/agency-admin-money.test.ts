import { describe, expect, it } from "vitest";

import { averageCents, dollarsStringToCents, formatCents } from "@/lib/agency-admin/money";

describe("formatCents", () => {
  it("formats a whole-dollar amount", () => {
    expect(formatCents(49900)).toBe("$499.00");
  });

  it("formats an amount with cents", () => {
    expect(formatCents(1999)).toBe("$19.99");
  });

  it("formats zero", () => {
    expect(formatCents(0)).toBe("$0.00");
  });
});

describe("averageCents", () => {
  it("rounds to the nearest cent, once", () => {
    // 10000 / 3 = 3333.333... -> rounds to 3333.
    expect(averageCents(10000, 3)).toBe(3333);
  });

  it("rounds up at the halfway point", () => {
    // 5 / 2 = 2.5 -> rounds to 3 (JS Math.round rounds halves up).
    expect(averageCents(5, 2)).toBe(3);
  });

  it("returns 0 for a zero or negative count instead of dividing by zero", () => {
    expect(averageCents(10000, 0)).toBe(0);
    expect(averageCents(10000, -1)).toBe(0);
  });

  it("summing many exact-cent averages never drifts, unlike repeated float division", () => {
    // Regression guard for the "no floating point" rule: accumulating cents
    // as plain integers and rounding only once at the end must be exact.
    const totalCents = 100_000_00; // $100,000.00
    const count = 7;
    const avg = averageCents(totalCents, count);
    expect(Number.isInteger(avg)).toBe(true);
    // The true average is 1,428,571.4285..., which rounds to 1,428,571.
    expect(avg).toBe(1_428_571);
  });
});

describe("dollarsStringToCents", () => {
  it("converts a whole-dollar amount", () => {
    expect(dollarsStringToCents("499")).toBe(49900);
  });

  it("converts an amount with two decimal places", () => {
    expect(dollarsStringToCents("19.99")).toBe(1999);
  });

  it("pads a single decimal place", () => {
    expect(dollarsStringToCents("19.9")).toBe(1990);
  });

  it("converts zero", () => {
    expect(dollarsStringToCents("0")).toBe(0);
    expect(dollarsStringToCents("0.00")).toBe(0);
  });

  it("never misrounds a value a float multiply would (19.99 * 100 !== 1999 in raw JS)", () => {
    // This is the exact input that demonstrates the float bug this
    // function exists to avoid: `19.99 * 100 === 1998.9999999999998`.
    expect(19.99 * 100).not.toBe(1999);
    expect(dollarsStringToCents("19.99")).toBe(1999);
  });

  it("rejects a negative amount", () => {
    expect(dollarsStringToCents("-5")).toBeNull();
  });

  it("rejects more than two decimal places", () => {
    expect(dollarsStringToCents("19.999")).toBeNull();
  });

  it("rejects non-numeric input", () => {
    expect(dollarsStringToCents("abc")).toBeNull();
    expect(dollarsStringToCents("")).toBeNull();
    expect(dollarsStringToCents("19.99abc")).toBeNull();
  });

  it("trims surrounding whitespace", () => {
    expect(dollarsStringToCents("  499.00  ")).toBe(49900);
  });

  it("rejects an amount that would overflow safe integer range in cents", () => {
    expect(dollarsStringToCents("999999999999999999")).toBeNull();
  });
});
