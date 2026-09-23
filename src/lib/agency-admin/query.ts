import type { ClientFiltersInput } from "@/lib/agency-admin/clients-validation";
import type { PaymentFiltersInput } from "@/lib/agency-admin/payments-validation";
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

/** Same contract as `leadsQueryString`, for `/admin/clients`. */
export function clientsQueryString(filters: ClientFiltersInput, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.plan) params.set("plan", filters.plan);
  if (filters.q) params.set("q", filters.q);
  for (const [key, value] of Object.entries(extra)) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

/** Same contract as `leadsQueryString`, for `/admin/payments`. */
export function paymentsQueryString(filters: PaymentFiltersInput, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.clientId) params.set("clientId", filters.clientId);
  if (filters.method) params.set("method", filters.method);
  if (filters.type) params.set("type", filters.type);
  for (const [key, value] of Object.entries(extra)) {
    if (value) params.set(key, value);
  }
  return params.toString();
}
