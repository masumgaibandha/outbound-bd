import { describe, expect, it } from "vitest";

import { isEeaOrUkCountry } from "@/lib/tracking/geo";

describe("isEeaOrUkCountry", () => {
  it("returns true for EU member states", () => {
    for (const code of ["DE", "FR", "NL", "IT", "ES", "IE", "PL"]) {
      expect(isEeaOrUkCountry(code)).toBe(true);
    }
  });

  it("returns true for non-EU EEA members", () => {
    for (const code of ["IS", "LI", "NO"]) {
      expect(isEeaOrUkCountry(code)).toBe(true);
    }
  });

  it("returns true for the United Kingdom (GB)", () => {
    expect(isEeaOrUkCountry("GB")).toBe(true);
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(isEeaOrUkCountry("de")).toBe(true);
    expect(isEeaOrUkCountry(" GB ")).toBe(true);
  });

  it("returns false for non-EU/EEA/UK countries", () => {
    for (const code of ["US", "CA", "AU", "BD", "IN", "SG"]) {
      expect(isEeaOrUkCountry(code)).toBe(false);
    }
  });

  it("returns false for null, undefined, or empty input", () => {
    expect(isEeaOrUkCountry(null)).toBe(false);
    expect(isEeaOrUkCountry(undefined)).toBe(false);
    expect(isEeaOrUkCountry("")).toBe(false);
  });

  it("rejects the non-standard 'UK' code (Vercel's header always sends 'GB')", () => {
    expect(isEeaOrUkCountry("UK")).toBe(false);
  });
});
