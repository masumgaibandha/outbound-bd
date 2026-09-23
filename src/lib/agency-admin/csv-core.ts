/**
 * Shared low-level CSV primitives — the BOM and formula-injection
 * protection every `/admin` CSV export (leads, clients, payments) must use
 * identically. Extracted out of `csv.ts` in Round 4B so the new client/
 * payment exporters reuse this instead of a second copy; `csv.ts`'s
 * `buildLeadsCsv`/`buildLeadsCsvFilename` now call into this file too, with
 * no change to their own output.
 */

/**
 * UTF-8 byte-order mark — without it, Excel on Windows (the operator's
 * likely tool) misreads the file as the system codepage and mangles any
 * non-ASCII character. Prepended to the CSV text, not the response headers.
 */
export const UTF8_BOM = "﻿";

/**
 * A leading `=`, `+`, `-`, `@`, or tab is how a spreadsheet decides a cell
 * is a formula — Excel/Sheets/LibreOffice all trigger on any of these, not
 * just `=`. Prefixing with a single quote forces the cell to render as
 * literal text in every one of them, which is the standard CSV
 * formula-injection mitigation (OWASP). Applied to every field, since any
 * of them can be attacker-controlled (a lead, client, or payment field
 * ultimately traces back to unauthenticated form input or free-text notes).
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

/** Builds a full CSV document (BOM + header + one row per item) from a header row and already-stringified data rows. */
export function buildCsv(header: string[], rows: string[][]): string {
  const lines = [formatCsvRow(header), ...rows.map(formatCsvRow)];
  return UTF8_BOM + lines.join("\r\n") + "\r\n";
}

/** e.g. `outboundbd-clients-2026-09-01-to-2026-09-30.csv` — falls back to "all" on either open end, since an export with no date filter still needs a valid filename. */
export function buildCsvFilename(prefix: string, from: string | undefined, to: string | undefined): string {
  return `outboundbd-${prefix}-${from ?? "all"}-to-${to ?? "all"}.csv`;
}
