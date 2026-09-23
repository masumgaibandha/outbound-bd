import {
  SOURCE_LABELS,
  STATUS_LABELS,
  activeClientsLabel,
  budgetLabel,
  serviceOrNeedLabel,
} from "@/lib/agency-admin/labels";
import { utcInstantToDhakaDateOnly } from "@/lib/agency-admin/timezone";
import type { LeadFiltersInput } from "@/lib/agency-admin/validation";
import type { LeadListRow } from "@/lib/agency-admin/leads-repository";

/**
 * UTF-8 byte-order mark — without it, Excel on Windows (the operator's
 * likely tool) misreads the file as the system codepage and mangles any
 * non-ASCII character. Prepended to the CSV text, not the response headers.
 */
const UTF8_BOM = "﻿";

const CSV_HEADER = [
  "Date",
  "Name",
  "Email",
  "Website",
  "Source",
  "Service or need",
  "Budget",
  "Active clients",
  "UTM campaign",
  "Status",
];

/**
 * A leading `=`, `+`, `-`, `@`, or tab is how a spreadsheet decides a cell
 * is a formula — Excel/Sheets/LibreOffice all trigger on any of these, not
 * just `=`. Prefixing with a single quote forces the cell to render as
 * literal text in every one of them, which is the standard CSV
 * formula-injection mitigation (OWASP). Applied to every field, since any
 * of them can be attacker-controlled (a lead is unauthenticated form
 * input).
 */
const FORMULA_TRIGGER_PATTERN = /^[=+\-@\t]/;

function sanitizeCsvField(value: string): string {
  const safe = FORMULA_TRIGGER_PATTERN.test(value) ? `'${value}` : value;
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

function formatCsvRow(fields: string[]): string {
  return fields.map(sanitizeCsvField).join(",");
}

export function buildLeadsCsv(leads: LeadListRow[]): string {
  const lines = [formatCsvRow(CSV_HEADER)];

  for (const lead of leads) {
    lines.push(
      formatCsvRow([
        utcInstantToDhakaDateOnly(lead.createdAt),
        lead.name,
        lead.email,
        lead.website,
        SOURCE_LABELS[lead.source],
        serviceOrNeedLabel(lead.source, lead.service, lead.need),
        budgetLabel(lead.budgetRange),
        lead.activeClients ? activeClientsLabel(lead.activeClients) : "",
        lead.utmCampaign ?? "",
        STATUS_LABELS[lead.status],
      ]),
    );
  }

  return UTF8_BOM + lines.join("\r\n") + "\r\n";
}

/** e.g. "outboundbd-leads-2026-09-01-to-2026-09-30.csv" — falls back to "all" on either open end, since a CSV export with no date filter still needs a valid filename. */
export function buildLeadsCsvFilename(filters: LeadFiltersInput): string {
  const from = filters.from ?? "all";
  const to = filters.to ?? "all";
  return `outboundbd-leads-${from}-to-${to}.csv`;
}
