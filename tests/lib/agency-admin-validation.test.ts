import { describe, expect, it } from "vitest";

import {
  leadIdSchema,
  leadNoteTextSchema,
  parseLeadFilters,
  parseLeadsPageParam,
} from "@/lib/agency-admin/validation";

describe("parseLeadFilters", () => {
  it("returns an empty object when nothing is given", () => {
    expect(parseLeadFilters({})).toEqual({});
  });

  it("accepts valid from/to/status/source/q", () => {
    expect(
      parseLeadFilters({
        from: "2026-09-01",
        to: "2026-09-30",
        status: "WON",
        source: "contact",
        q: "acme",
      }),
    ).toEqual({ from: "2026-09-01", to: "2026-09-30", status: "WON", source: "contact", q: "acme" });
  });

  it("drops an individually invalid field without discarding the rest", () => {
    expect(parseLeadFilters({ from: "not-a-date", status: "WON" })).toEqual({ status: "WON" });
    expect(parseLeadFilters({ status: "NOT_A_STATUS", source: "contact" })).toEqual({ source: "contact" });
    expect(parseLeadFilters({ source: "not-a-source" })).toEqual({});
  });

  it("drops an overlong search term", () => {
    expect(parseLeadFilters({ q: "x".repeat(201) })).toEqual({});
  });

  it("takes the first value when given an array (repeated query param)", () => {
    expect(parseLeadFilters({ status: ["WON", "LOST"] })).toEqual({ status: "WON" });
  });

  it("ignores an empty string", () => {
    expect(parseLeadFilters({ q: "   " })).toEqual({});
  });
});

describe("parseLeadsPageParam", () => {
  it("defaults to 1 for missing/invalid input", () => {
    expect(parseLeadsPageParam(undefined)).toBe(1);
    expect(parseLeadsPageParam("abc")).toBe(1);
    expect(parseLeadsPageParam("0")).toBe(1);
    expect(parseLeadsPageParam("-5")).toBe(1);
  });

  it("parses a valid page number", () => {
    expect(parseLeadsPageParam("3")).toBe(3);
  });

  it("clamps an absurdly large page number", () => {
    expect(parseLeadsPageParam("999999999")).toBe(100_000);
  });
});

describe("leadIdSchema", () => {
  it("accepts a 24-char hex ObjectId string", () => {
    expect(leadIdSchema.safeParse("507f1f77bcf86cd799439011").success).toBe(true);
  });

  it("rejects a malformed id", () => {
    expect(leadIdSchema.safeParse("not-an-id").success).toBe(false);
    expect(leadIdSchema.safeParse("").success).toBe(false);
  });
});

describe("leadNoteTextSchema", () => {
  it("rejects an empty note", () => {
    expect(leadNoteTextSchema.safeParse("   ").success).toBe(false);
  });

  it("rejects a note over 2000 characters", () => {
    expect(leadNoteTextSchema.safeParse("x".repeat(2001)).success).toBe(false);
  });

  it("accepts and trims a valid note", () => {
    const result = leadNoteTextSchema.safeParse("  Called, left voicemail.  ");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("Called, left voicemail.");
  });
});
