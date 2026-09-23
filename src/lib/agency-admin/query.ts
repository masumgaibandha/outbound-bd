import type { LeadFiltersInput } from "@/lib/agency-admin/validation";

/** Builds a query string from the current filter state plus any extra params (e.g. `page`) — shared by pagination links and the CSV export link so both always reflect exactly "the current filtered view". */
export function leadsQueryString(filters: LeadFiltersInput, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.status) params.set("status", filters.status);
  if (filters.source) params.set("source", filters.source);
  if (filters.q) params.set("q", filters.q);
  for (const [key, value] of Object.entries(extra)) {
    if (value) params.set(key, value);
  }
  return params.toString();
}
