import {
  SOURCE_LABELS,
  STATUS_LABELS,
  activeClientsLabel,
  budgetLabel,
  serviceOrNeedLabel,
  teamSizeLabel,
} from "@/lib/agency-admin/labels";
import { buildCsv, buildCsvFilename } from "@/lib/agency-admin/csv-core";
import { utcInstantToDhakaDateOnly } from "@/lib/agency-admin/timezone";
import type { LeadFiltersInput } from "@/lib/agency-admin/validation";
import type { LeadListRow } from "@/lib/agency-admin/leads-repository";

const CSV_HEADER = [
  "Date",
  "Name",
  "Email",
  "Website",
  "Source",
  "Service or need",
  "Budget",
  "Active clients",
  "Team size",
  "UTM campaign",
  "Status",
];

export function buildLeadsCsv(leads: LeadListRow[]): string {
  const rows = leads.map((lead) => [
    utcInstantToDhakaDateOnly(lead.createdAt),
    lead.name,
    lead.email,
    lead.website,
    SOURCE_LABELS[lead.source],
    serviceOrNeedLabel(lead.source, lead.service, lead.need),
    budgetLabel(lead.budgetRange),
    lead.activeClients ? activeClientsLabel(lead.activeClients) : "",
    lead.teamSize ? teamSizeLabel(lead.teamSize) : "",
    lead.utmCampaign ?? "",
    STATUS_LABELS[lead.status],
  ]);

  return buildCsv(CSV_HEADER, rows);
}

/** e.g. "outboundbd-leads-2026-09-01-to-2026-09-30.csv" — falls back to "all" on either open end, since a CSV export with no date filter still needs a valid filename. */
export function buildLeadsCsvFilename(filters: LeadFiltersInput): string {
  return buildCsvFilename("leads", filters.from, filters.to);
}
