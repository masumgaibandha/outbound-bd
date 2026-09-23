import { CLIENT_PLAN_LABELS, CLIENT_STATUS_LABELS } from "@/lib/agency-admin/clients-labels";
import { buildCsv, buildCsvFilename } from "@/lib/agency-admin/csv-core";
import type { ClientListRow } from "@/lib/agency-admin/clients-repository";
import { formatCents } from "@/lib/agency-admin/money";
import { utcInstantToDhakaDateOnly } from "@/lib/agency-admin/timezone";

const CSV_HEADER = [
  "Company",
  "Contact name",
  "Email",
  "Plan",
  "Monthly amount",
  "Status",
  "Start date",
  "Next billing date",
  "Amount collected to date",
];

export function buildClientsCsv(clients: ClientListRow[]): string {
  const rows = clients.map((client) => [
    client.company,
    client.name,
    client.email,
    CLIENT_PLAN_LABELS[client.plan],
    formatCents(client.monthlyAmountCents),
    CLIENT_STATUS_LABELS[client.status],
    utcInstantToDhakaDateOnly(client.startDate),
    client.nextBillingDate ?? "",
    formatCents(client.amountCollectedToDateCents),
  ]);

  return buildCsv(CSV_HEADER, rows);
}

/** No date filter on the clients list itself, so this is always the "all" range. */
export function buildClientsCsvFilename(): string {
  return buildCsvFilename("clients", undefined, undefined);
}
