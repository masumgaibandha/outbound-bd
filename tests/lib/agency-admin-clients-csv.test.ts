import { describe, expect, it } from "vitest";

import { buildClientsCsv, buildClientsCsvFilename } from "@/lib/agency-admin/clients-csv";
import type { ClientListRow } from "@/lib/agency-admin/clients-repository";

function baseClient(overrides: Partial<ClientListRow> = {}): ClientListRow {
  return {
    id: "507f1f77bcf86cd799439011",
    name: "Alex Founder",
    company: "Acme Inc",
    email: "alex@acme.com",
    plan: "LAUNCH",
    monthlyAmountCents: 49900,
    status: "ACTIVE",
    startDate: new Date("2026-09-01T00:00:00Z"),
    nextBillingDate: "2026-10-01",
    amountCollectedToDateCents: 99800,
    ...overrides,
  };
}

describe("buildClientsCsv", () => {
  it("starts with a UTF-8 BOM", () => {
    const csv = buildClientsCsv([baseClient()]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("includes a header row and one row per client with human-readable labels and formatted money", () => {
    const csv = buildClientsCsv([baseClient()]);
    const lines = csv.replace(/^﻿/, "").split("\r\n").filter(Boolean);
    expect(lines[0]).toBe(
      "Company,Contact name,Email,Plan,Monthly amount,Status,Start date,Next billing date,Amount collected to date",
    );
    expect(lines[1]).toContain("Acme Inc");
    expect(lines[1]).toContain("Launch");
    expect(lines[1]).toContain("Active");
    expect(lines[1]).toContain("$499.00");
    expect(lines[1]).toContain("$998.00");
  });

  it("prefixes a leading = with a single quote to prevent formula injection", () => {
    const csv = buildClientsCsv([baseClient({ company: "=cmd|'/c calc'!A1" })]);
    expect(csv).toContain("'=cmd|'/c calc'!A1");
  });

  it("renders 'N/A' rather than an empty string for a paused/ended client's next billing date", () => {
    const csv = buildClientsCsv([baseClient({ nextBillingDate: null })]);
    const lines = csv.replace(/^﻿/, "").split("\r\n").filter(Boolean);
    // The CSV itself stores an empty field (the label is a UI-only "N/A" —
    // an empty CSV cell is the correct, unambiguous representation).
    expect(lines[1].endsWith(",$0.00")).toBe(false);
    expect(lines[1]).toContain(",,");
  });
});

describe("buildClientsCsvFilename", () => {
  it("always returns the 'all' range filename, since the clients list has no date filter", () => {
    expect(buildClientsCsvFilename()).toBe("outboundbd-clients-all-to-all.csv");
  });
});
