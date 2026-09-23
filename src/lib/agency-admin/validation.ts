import { z } from "zod";

import { SOURCE_VALUES, STATUS_VALUES } from "@/lib/agency-admin/labels";
import { isValidDateOnly } from "@/lib/agency-admin/timezone";

/**
 * Every value here is untrusted request input — a URL query param, a Server
 * Action argument, or a route-handler search param — so every one of these
 * is validated with zod before it ever reaches a MongoDB query, never
 * trusted as a pre-shaped filter/sort/regex.
 */

const dateOnlySchema = z
  .string()
  .trim()
  .refine(isValidDateOnly, "Enter a valid date (YYYY-MM-DD)");

export const leadStatusValueSchema = z.enum(STATUS_VALUES as [string, ...string[]]);

export const leadSourceValueSchema = z.enum(SOURCE_VALUES as [string, ...string[]]);

const MAX_SEARCH_LENGTH = 200;

export const leadFiltersSchema = z.object({
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
  status: leadStatusValueSchema.optional(),
  source: leadSourceValueSchema.optional(),
  q: z.string().trim().max(MAX_SEARCH_LENGTH, "Search is too long").optional(),
});

export type LeadFiltersInput = z.infer<typeof leadFiltersSchema>;

export type RawSearchParams = Record<string, string | string[] | undefined>;

/**
 * Reads filter values out of a page's `searchParams` (or a route handler's
 * `URL.searchParams`), silently dropping any single field that fails
 * validation rather than rejecting the whole filter set — a malformed `to`
 * date shouldn't also throw away a perfectly valid `status` filter. Used by
 * the leads list page, the dashboard, and the CSV export route, so all
 * three parse "the current filters" identically.
 */
export function parseLeadFilters(searchParams: RawSearchParams): LeadFiltersInput {
  const pick = (key: string): string | undefined => {
    const value = searchParams[key];
    const single = Array.isArray(value) ? value[0] : value;
    const trimmed = single?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : undefined;
  };

  const filters: LeadFiltersInput = {};

  const from = pick("from");
  if (from && isValidDateOnly(from)) filters.from = from;

  const to = pick("to");
  if (to && isValidDateOnly(to)) filters.to = to;

  const status = pick("status");
  if (status && leadStatusValueSchema.safeParse(status).success) {
    filters.status = status as LeadFiltersInput["status"];
  }

  const source = pick("source");
  if (source && leadSourceValueSchema.safeParse(source).success) {
    filters.source = source as LeadFiltersInput["source"];
  }

  const q = pick("q");
  if (q && q.length <= MAX_SEARCH_LENGTH) filters.q = q;

  return filters;
}

const MAX_PAGE = 100_000;

/** `raw` is untrusted request input — always returns a finite integer `>= 1`, same clamp contract as `masterclass/pagination.ts`'s `parsePageParam`. */
export function parseLeadsPageParam(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, MAX_PAGE);
}

export const LEADS_PAGE_SIZE = 25;

const MONGO_OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

export const leadIdSchema = z.string().regex(MONGO_OBJECT_ID_PATTERN, "Invalid lead id");

const MAX_NOTE_LENGTH = 2000;

export const leadNoteTextSchema = z
  .string()
  .trim()
  .min(1, "Note can't be empty")
  .max(MAX_NOTE_LENGTH, "Note is too long (2000 characters max)");
