import "server-only";

import type { QueryFilter, Types } from "mongoose";

import type { CreatePaymentInput, PaymentFiltersInput, UpdatePaymentInput } from "@/lib/agency-admin/payments-validation";
import {
  DHAKA_UTC_OFFSET_STRING,
  dhakaDateOnlyToUtcEndExclusive,
  dhakaDateOnlyToUtcStart,
  lastNDhakaMonthKeys,
} from "@/lib/agency-admin/timezone";
import { Client } from "@/lib/models/client";
import { Payment, type PaymentDocument } from "@/lib/models/payment";
import { connectToDatabase } from "@/lib/mongoose";

/** A hard ceiling on the CSV export, generous for a single small agency's payment volume. */
const MAX_EXPORT_ROWS = 50_000;

/** Shared by the paginated list, the CSV export, and the client-detail payment list. */
export function buildPaymentsFilterQuery(filters: PaymentFiltersInput): QueryFilter<PaymentDocument> {
  const query: QueryFilter<PaymentDocument> = {};

  if (filters.from || filters.to) {
    const paidAt: { $gte?: Date; $lt?: Date } = {};
    if (filters.from) paidAt.$gte = dhakaDateOnlyToUtcStart(filters.from);
    if (filters.to) paidAt.$lt = dhakaDateOnlyToUtcEndExclusive(filters.to);
    query.paidAt = paidAt;
  }

  if (filters.clientId) query.clientId = filters.clientId;
  if (filters.method) query.method = filters.method;
  if (filters.type) query.type = filters.type;

  return query;
}

export interface PaymentListRow {
  id: string;
  clientId: string;
  clientCompany: string;
  amountCents: number;
  currency: PaymentDocument["currency"];
  paidAt: Date;
  method: PaymentDocument["method"];
  type: PaymentDocument["type"];
  reference?: string;
  note?: string;
}

type LeanPaymentDocument = PaymentDocument & { _id: Types.ObjectId };

async function toListRows(docs: LeanPaymentDocument[]): Promise<PaymentListRow[]> {
  if (docs.length === 0) return [];
  const clientIds = [...new Set(docs.map((doc) => String(doc.clientId)))];
  const clients = await Client.find({ _id: { $in: clientIds } })
    .select({ company: 1 })
    .lean<{ _id: Types.ObjectId; company: string }[]>();
  const companyById = new Map(clients.map((client) => [String(client._id), client.company]));

  return docs.map((doc) => ({
    id: String(doc._id),
    clientId: String(doc.clientId),
    clientCompany: companyById.get(String(doc.clientId)) ?? "(unknown client)",
    amountCents: doc.amountCents,
    currency: doc.currency,
    paidAt: doc.paidAt,
    method: doc.method,
    type: doc.type,
    reference: doc.reference,
    note: doc.note,
  }));
}

/** Offset-paginated, newest first. `page`/`pageSize` must already be clamped by the caller. */
export async function listPaymentsPage(
  filters: PaymentFiltersInput,
  page: number,
  pageSize: number,
): Promise<{ payments: PaymentListRow[]; totalCount: number }> {
  await connectToDatabase();
  const query = buildPaymentsFilterQuery(filters);
  const skip = (page - 1) * pageSize;

  const [rows, totalCount] = await Promise.all([
    Payment.find(query).sort({ paidAt: -1, _id: -1 }).skip(skip).limit(pageSize).lean<LeanPaymentDocument[]>(),
    Payment.countDocuments(query),
  ]);

  return { payments: await toListRows(rows), totalCount };
}

/** Every filtered row, capped at `MAX_EXPORT_ROWS` — used only by the CSV export, never the paginated list. */
export async function listAllFilteredPayments(filters: PaymentFiltersInput): Promise<PaymentListRow[]> {
  await connectToDatabase();
  const query = buildPaymentsFilterQuery(filters);
  const rows = await Payment.find(query).sort({ paidAt: -1, _id: -1 }).limit(MAX_EXPORT_ROWS).lean<LeanPaymentDocument[]>();
  return toListRows(rows);
}

/** Every payment for one client, newest first — a single client's payment history is always small enough to load in one page. */
export async function listPaymentsForClient(clientId: string): Promise<PaymentListRow[]> {
  await connectToDatabase();
  const rows = await Payment.find({ clientId }).sort({ paidAt: -1, _id: -1 }).lean<LeanPaymentDocument[]>();
  return toListRows(rows);
}

export type PaymentDetail = PaymentDocument & { id: string };

function toPaymentDetail(doc: LeanPaymentDocument): PaymentDetail {
  return { ...doc, id: String(doc._id) };
}

/** `null` if no document matches `id`. */
export async function findPaymentById(id: string): Promise<PaymentDetail | null> {
  await connectToDatabase();
  const doc = await Payment.findById(id).lean<LeanPaymentDocument | null>();
  if (!doc) return null;
  return toPaymentDetail(doc);
}

export async function createPayment(clientId: string, input: CreatePaymentInput): Promise<PaymentDetail> {
  await connectToDatabase();
  const created = await Payment.create({
    clientId,
    amountCents: input.amountCents,
    currency: "USD",
    paidAt: dhakaDateOnlyToUtcStart(input.paidAt),
    method: input.method,
    type: input.type,
    reference: input.reference,
    note: input.note,
  });
  return toPaymentDetail(created.toObject() as LeanPaymentDocument);
}

/** `reference`/`note` each go into exactly one of `$set`/`$unset` for the same reason `updateClient` does — MongoDB rejects an update referencing one path from both operators. `null` if `id` doesn't match any document. */
export async function updatePayment(id: string, input: UpdatePaymentInput): Promise<PaymentDetail | null> {
  await connectToDatabase();

  const setFields: Record<string, unknown> = {
    amountCents: input.amountCents,
    paidAt: dhakaDateOnlyToUtcStart(input.paidAt),
    method: input.method,
    type: input.type,
  };
  const unsetFields: Record<string, ""> = {};

  if (input.reference === undefined) unsetFields.reference = "";
  else setFields.reference = input.reference;

  if (input.note === undefined) unsetFields.note = "";
  else setFields.note = input.note;

  const update: Record<string, unknown> = { $set: setFields };
  if (Object.keys(unsetFields).length > 0) update.$unset = unsetFields;

  const doc = await Payment.findByIdAndUpdate(id, update, { returnDocument: "after" }).lean<LeanPaymentDocument | null>();
  if (!doc) return null;
  return toPaymentDetail(doc);
}

/** `true` if a document was actually deleted — the caller (the confirmed-delete Server Action) uses this to distinguish "deleted" from "already gone". */
export async function deletePayment(id: string): Promise<boolean> {
  await connectToDatabase();
  const result = await Payment.findByIdAndDelete(id);
  return result !== null;
}

export interface RevenueByType {
  setupCents: number;
  monthlyCents: number;
  otherCents: number;
  totalCents: number;
}

/** Collected revenue (from actual `Payment` records, not committed MRR) within `filters`' date range, broken down by `type`. Plain integer `$sum` — exact for integer cents. */
export async function getRevenueByType(filters: PaymentFiltersInput): Promise<RevenueByType> {
  await connectToDatabase();
  const query = buildPaymentsFilterQuery(filters);
  const rows = await Payment.aggregate<{ _id: PaymentDocument["type"]; total: number }>([
    { $match: query },
    { $group: { _id: "$type", total: { $sum: "$amountCents" } } },
  ]);

  const byType = new Map(rows.map((row) => [row._id, row.total]));
  const setupCents = byType.get("SETUP") ?? 0;
  const monthlyCents = byType.get("MONTHLY") ?? 0;
  const otherCents = byType.get("OTHER") ?? 0;

  return { setupCents, monthlyCents, otherCents, totalCents: setupCents + monthlyCents + otherCents };
}

export interface MonthlyCollected {
  month: string; // "YYYY-MM", Asia/Dhaka
  collectedCents: number;
}

/**
 * Always the last `monthsBack` real Asia/Dhaka calendar months ending at
 * `now`'s month (see `lastNDhakaMonthKeys`'s own doc comment) — independent
 * of the dashboard's selected date-range filter. Every month in range is
 * included even with zero payments, so a trend list never silently skips a
 * quiet month.
 */
export async function getMonthlyCollectedSeries(monthsBack = 6, now: Date = new Date()): Promise<MonthlyCollected[]> {
  await connectToDatabase();
  const monthKeys = lastNDhakaMonthKeys(monthsBack, now);
  const rangeStart = dhakaDateOnlyToUtcStart(`${monthKeys[0]}-01`);

  const rows = await Payment.aggregate<{ _id: string; total: number }>([
    { $match: { paidAt: { $gte: rangeStart } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$paidAt", timezone: DHAKA_UTC_OFFSET_STRING } },
        total: { $sum: "$amountCents" },
      },
    },
  ]);

  const totalByMonth = new Map(rows.map((row) => [row._id, row.total]));
  return monthKeys.map((month) => ({ month, collectedCents: totalByMonth.get(month) ?? 0 }));
}
