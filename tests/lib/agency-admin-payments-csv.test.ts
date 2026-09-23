import { describe, expect, it } from "vitest";

import { buildPaymentsCsv, buildPaymentsCsvFilename } from "@/lib/agency-admin/payments-csv";
import type { PaymentListRow } from "@/lib/agency-admin/payments-repository";

function basePayment(overrides: Partial<PaymentListRow> = {}): PaymentListRow {
  return {
    id: "507f1f77bcf86cd799439011",
    clientId: "507f1f77bcf86cd799439022",
    clientCompany: "Acme Inc",
    amountCents: 49900,
    currency: "USD",
    paidAt: new Date("2026-09-15T00:00:00Z"),
    method: "WISE",
    type: "MONTHLY",
    ...overrides,
  };
}

describe("buildPaymentsCsv", () => {
  it("starts with a UTF-8 BOM", () => {
    const csv = buildPaymentsCsv([basePayment()]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("includes a header row and one row per payment with human-readable labels and formatted money", () => {
    const csv = buildPaymentsCsv([basePayment()]);
    const lines = csv.replace(/^﻿/, "").split("\r\n").filter(Boolean);
    expect(lines[0]).toBe("Date,Client,Amount,Method,Type,Reference,Note");
    expect(lines[1]).toContain("Acme Inc");
    expect(lines[1]).toContain("$499.00");
    expect(lines[1]).toContain("Wise");
    expect(lines[1]).toContain("Monthly");
  });

  it("prefixes a leading = with a single quote to prevent formula injection", () => {
    const csv = buildPaymentsCsv([basePayment({ reference: "=cmd|'/c calc'!A1" })]);
    expect(csv).toContain("'=cmd|'/c calc'!A1");
  });

  it("prefixes leading +, -, @ and tab the same way", () => {
    for (const trigger of ["+1", "-1", "@SUM(A1)", "\tdanger"]) {
      const csv = buildPaymentsCsv([basePayment({ note: trigger })]);
      expect(csv).toContain(`'${trigger}`);
    }
  });

  it("quotes a field containing a comma or quote", () => {
    const csv = buildPaymentsCsv([basePayment({ note: 'Has, a "quote"' })]);
    expect(csv).toContain('"Has, a ""quote"""');
  });
});

describe("buildPaymentsCsvFilename", () => {
  it("builds a filename from the date range", () => {
    expect(buildPaymentsCsvFilename({ from: "2026-09-01", to: "2026-09-30" })).toBe(
      "outboundbd-payments-2026-09-01-to-2026-09-30.csv",
    );
  });

  it("falls back to 'all' for an open-ended range", () => {
    expect(buildPaymentsCsvFilename({})).toBe("outboundbd-payments-all-to-all.csv");
  });
});
