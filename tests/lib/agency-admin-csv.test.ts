import { describe, expect, it } from "vitest";

import { buildLeadsCsv, buildLeadsCsvFilename } from "@/lib/agency-admin/csv";
import type { LeadListRow } from "@/lib/agency-admin/leads-repository";

function baseLead(overrides: Partial<LeadListRow> = {}): LeadListRow {
  return {
    id: "507f1f77bcf86cd799439011",
    createdAt: new Date("2026-09-15T10:00:00Z"),
    name: "Alex Lead",
    email: "alex@example.com",
    website: "https://example.com",
    source: "contact",
    service: "cold-email-outreach",
    budgetRange: "1k-plus",
    status: "NEW",
    ...overrides,
  };
}

describe("buildLeadsCsv", () => {
  it("starts with a UTF-8 BOM", () => {
    const csv = buildLeadsCsv([baseLead()]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("includes a header row and one row per lead with human-readable labels", () => {
    const csv = buildLeadsCsv([baseLead()]);
    const lines = csv.replace(/^﻿/, "").split("\r\n").filter(Boolean);
    expect(lines[0]).toBe(
      "Date,Name,Email,Website,Source,Service or need,Budget,Active clients,UTM campaign,Status",
    );
    expect(lines[1]).toContain("Alex Lead");
    expect(lines[1]).toContain("Contact form");
    expect(lines[1]).toContain("New");
  });

  it("prefixes a leading = with a single quote to prevent formula injection", () => {
    const csv = buildLeadsCsv([baseLead({ name: "=cmd|'/c calc'!A1" })]);
    expect(csv).toContain("'=cmd|'/c calc'!A1");
  });

  it("prefixes leading +, -, @ and tab the same way", () => {
    for (const trigger of ["+1", "-1", "@SUM(A1)", "\tdanger"]) {
      const csv = buildLeadsCsv([baseLead({ name: trigger })]);
      expect(csv).toContain(`'${trigger}`);
    }
  });

  it("does not prefix an ordinary value", () => {
    const csv = buildLeadsCsv([baseLead({ name: "Ordinary Name" })]);
    expect(csv).toContain("Ordinary Name");
    expect(csv).not.toContain("'Ordinary Name");
  });

  it("quotes a field containing a comma, quote, or newline", () => {
    const csv = buildLeadsCsv([baseLead({ name: 'Has, a "quote"' })]);
    expect(csv).toContain('"Has, a ""quote"""');
  });

  it("renders the date as the Asia/Dhaka calendar date", () => {
    // 2026-09-15T20:00:00Z is 2026-09-16T02:00 in Dhaka.
    const csv = buildLeadsCsv([baseLead({ createdAt: new Date("2026-09-15T20:00:00Z") })]);
    expect(csv).toContain("2026-09-16");
  });
});

describe("buildLeadsCsvFilename", () => {
  it("builds a filename from the date range", () => {
    expect(buildLeadsCsvFilename({ from: "2026-09-01", to: "2026-09-30" })).toBe(
      "outboundbd-leads-2026-09-01-to-2026-09-30.csv",
    );
  });

  it("falls back to 'all' for an open-ended range", () => {
    expect(buildLeadsCsvFilename({})).toBe("outboundbd-leads-all-to-all.csv");
  });
});
