import { describe, expect, it } from "vitest";

import { formatBDT, toBengaliDigits } from "@/lib/masterclass/format";

describe("formatBDT", () => {
  it("renders clean Latin numerals with a comma-grouped amount, never Bengali digits", () => {
    expect(formatBDT(1499)).toBe("৳1,499");
    expect(formatBDT(2499)).toBe("৳2,499");
  });

  it("never contains a Bengali digit", () => {
    expect(formatBDT(1499)).not.toMatch(/[০-৯]/);
    expect(formatBDT(2499)).not.toMatch(/[০-৯]/);
  });

  it("still prefixes the Bengali Taka symbol", () => {
    expect(formatBDT(1499).startsWith("৳")).toBe(true);
  });
});

describe("toBengaliDigits (unaffected by the formatBDT change — still used for dates/body copy)", () => {
  it("converts Latin digits to Bengali digits", () => {
    expect(toBengaliDigits("2026")).toBe("২০২৬");
    expect(toBengaliDigits("23-24")).toBe("২৩-২৪");
  });
});
