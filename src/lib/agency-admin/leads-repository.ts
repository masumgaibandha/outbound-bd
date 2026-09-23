import "server-only";

import type { QueryFilter } from "mongoose";

import type { LeadFiltersInput } from "@/lib/agency-admin/validation";
import { dhakaDateOnlyToUtcEndExclusive, dhakaDateOnlyToUtcStart } from "@/lib/agency-admin/timezone";
import { Inquiry, type InquiryDocument, type InquiryStatus } from "@/lib/models/inquiry";
import { connectToDatabase } from "@/lib/mongoose";

/** A hard ceiling on the CSV export and dashboard aggregations — generous for a single small agency's lead volume, just enough to reject an absurd/unbounded query. */
const MAX_EXPORT_ROWS = 50_000;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Shared by the paginated list, the CSV export, and the dashboard
 * aggregation, so all three always agree on what "the current filters"
 * means. `filters` is assumed already zod-validated by the caller — this
 * function only ever reads plain strings out of it, never builds a query
 * from unvalidated input.
 */
export function buildLeadsFilterQuery(filters: LeadFiltersInput): QueryFilter<InquiryDocument> {
  const query: QueryFilter<InquiryDocument> = {};

  if (filters.from || filters.to) {
    const createdAt: { $gte?: Date; $lt?: Date } = {};
    if (filters.from) createdAt.$gte = dhakaDateOnlyToUtcStart(filters.from);
    if (filters.to) createdAt.$lt = dhakaDateOnlyToUtcEndExclusive(filters.to);
    query.createdAt = createdAt;
  }

  if (filters.status) {
    query.status = filters.status as InquiryStatus;
  }

  if (filters.source) {
    query.source = filters.source as InquiryDocument["source"];
  }

  if (filters.q) {
    const pattern = new RegExp(escapeRegex(filters.q), "i");
    query.$or = [{ name: pattern }, { email: pattern }, { website: pattern }];
  }

  return query;
}

export interface LeadListRow {
  id: string;
  createdAt: Date;
  name: string;
  email: string;
  website: string;
  source: InquiryDocument["source"];
  service?: string;
  need?: string;
  budgetRange: string;
  activeClients?: string;
  utmCampaign?: string;
  status: InquiryStatus;
}

export interface ListLeadsPageResult {
  leads: LeadListRow[];
  totalCount: number;
}

function toListRow(doc: InquiryDocument & { _id: unknown }): LeadListRow {
  return {
    id: String(doc._id),
    createdAt: doc.createdAt,
    name: doc.name,
    email: doc.email,
    website: doc.website,
    source: doc.source,
    service: doc.service,
    need: doc.need,
    budgetRange: doc.budgetRange,
    activeClients: doc.activeClients,
    utmCampaign: doc.attribution?.utmCampaign,
    status: doc.status,
  };
}

/** Offset-paginated, newest first. `page`/`pageSize` must already be clamped by the caller — trusted as plain numbers, never raw request input. */
export async function listLeadsPage(
  filters: LeadFiltersInput,
  page: number,
  pageSize: number,
): Promise<ListLeadsPageResult> {
  await connectToDatabase();
  const query = buildLeadsFilterQuery(filters);
  const skip = (page - 1) * pageSize;

  const [rows, totalCount] = await Promise.all([
    Inquiry.find(query).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(pageSize).lean<
      (InquiryDocument & { _id: unknown })[]
    >(),
    Inquiry.countDocuments(query),
  ]);

  return { leads: rows.map(toListRow), totalCount };
}

/** Every filtered row, capped at `MAX_EXPORT_ROWS` — used only by the CSV export, never the paginated list. */
export async function listAllFilteredLeads(filters: LeadFiltersInput): Promise<LeadListRow[]> {
  await connectToDatabase();
  const query = buildLeadsFilterQuery(filters);
  const rows = await Inquiry.find(query)
    .sort({ createdAt: -1, _id: -1 })
    .limit(MAX_EXPORT_ROWS)
    .lean<(InquiryDocument & { _id: unknown })[]>();
  return rows.map(toListRow);
}

export type LeadDetail = InquiryDocument & { id: string };

/**
 * `.lean()` reads skip Mongoose's schema defaults (same caveat
 * `models/inquiry.ts` documents for `source` on a legacy document) — a
 * document created before `statusHistory`/`notes` existed has neither field
 * at all. Defaulted to `[]` here, once, so every caller (the detail page,
 * the two mutations below) can treat both arrays as always present.
 */
function toLeadDetail(doc: InquiryDocument & { _id: unknown }): LeadDetail {
  return {
    ...doc,
    id: String(doc._id),
    statusHistory: doc.statusHistory ?? [],
    notes: doc.notes ?? [],
  };
}

/** `null` if no document matches `id` — the caller renders a not-found state, never throws. */
export async function findLeadById(id: string): Promise<LeadDetail | null> {
  await connectToDatabase();
  const doc = await Inquiry.findById(id).lean<(InquiryDocument & { _id: unknown }) | null>();
  if (!doc) return null;
  return toLeadDetail(doc);
}

/**
 * Appends a `statusHistory` entry and sets `status` in one atomic update.
 * `null` if `id` doesn't match any document. A no-op status change (same
 * value) still records a history entry — the operator explicitly chose to
 * re-save it, which is itself a fact worth keeping, not a distinct
 * "unchanged" branch to special-case.
 */
export async function changeLeadStatus(id: string, status: InquiryStatus): Promise<LeadDetail | null> {
  await connectToDatabase();
  const changedAt = new Date();
  const doc = await Inquiry.findByIdAndUpdate(
    id,
    {
      $set: { status },
      $push: { statusHistory: { status, changedAt } },
    },
    { returnDocument: "after" },
  ).lean<(InquiryDocument & { _id: unknown }) | null>();
  if (!doc) return null;
  return toLeadDetail(doc);
}

/** Append-only — no edit/delete in this round. `null` if `id` doesn't match any document. */
export async function addLeadNote(id: string, text: string): Promise<LeadDetail | null> {
  await connectToDatabase();
  const doc = await Inquiry.findByIdAndUpdate(
    id,
    { $push: { notes: { text, createdAt: new Date() } } },
    { returnDocument: "after" },
  ).lean<(InquiryDocument & { _id: unknown }) | null>();
  if (!doc) return null;
  return toLeadDetail(doc);
}

export interface DashboardStats {
  totalLeads: number;
  bySource: { source: string; count: number }[];
  byStatus: { status: string; count: number }[];
  byUtmCampaign: { campaign: string; count: number }[];
  byUtmContent: { content: string; count: number }[];
  toCallBookedOrBeyond: number;
  toWon: number;
}

const PAST_CALL_BOOKED: InquiryStatus[] = ["CALL_BOOKED", "PROPOSAL_SENT", "WON", "LOST"];

/**
 * All figures scoped to `filters`' date range (source/status/q filters, if
 * present, apply too — the dashboard and the leads list share one filter
 * shape). Conversion rate is "reached CALL_BOOKED or a later stage in the
 * pipeline, ever" and "reached WON" — both computed against the leads
 * CREATED in the selected range, not against status changes that happened
 * in the range, so the denominator is stable regardless of when a lead's
 * status was last touched.
 */
export async function getDashboardStats(filters: LeadFiltersInput): Promise<DashboardStats> {
  await connectToDatabase();
  const query = buildLeadsFilterQuery(filters);

  const [totalLeads, bySourceAgg, byStatusAgg, byCampaignAgg, byContentAgg, pastCallBookedCount, wonCount] =
    await Promise.all([
      Inquiry.countDocuments(query),
      Inquiry.aggregate<{ _id: string; count: number }>([
        { $match: query },
        { $group: { _id: "$source", count: { $sum: 1 } } },
      ]),
      Inquiry.aggregate<{ _id: string; count: number }>([
        { $match: query },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Inquiry.aggregate<{ _id: string; count: number }>([
        { $match: { ...query, "attribution.utmCampaign": { $exists: true, $ne: "" } } },
        { $group: { _id: "$attribution.utmCampaign", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
      Inquiry.aggregate<{ _id: string; count: number }>([
        { $match: { ...query, "attribution.utmContent": { $exists: true, $ne: "" } } },
        { $group: { _id: "$attribution.utmContent", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
      Inquiry.countDocuments({ ...query, status: { $in: PAST_CALL_BOOKED } }),
      Inquiry.countDocuments({ ...query, status: "WON" }),
    ]);

  return {
    totalLeads,
    bySource: bySourceAgg.map((row) => ({ source: row._id, count: row.count })),
    byStatus: byStatusAgg.map((row) => ({ status: row._id, count: row.count })),
    byUtmCampaign: byCampaignAgg.map((row) => ({ campaign: row._id, count: row.count })),
    byUtmContent: byContentAgg.map((row) => ({ content: row._id, count: row.count })),
    toCallBookedOrBeyond: pastCallBookedCount,
    toWon: wonCount,
  };
}
