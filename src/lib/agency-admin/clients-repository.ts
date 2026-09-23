import "server-only";

import type { QueryFilter, Types } from "mongoose";

import { nextBillingDateInDhaka } from "@/lib/agency-admin/billing";
import type { CreateClientInput, ClientFiltersInput, UpdateClientInput } from "@/lib/agency-admin/clients-validation";
import { dhakaDateOnlyToUtcStart } from "@/lib/agency-admin/timezone";
import { Client, type ClientDocument } from "@/lib/models/client";
import { connectToDatabase } from "@/lib/mongoose";

/** A hard ceiling on the CSV export, generous for a single small agency's client volume. */
const MAX_EXPORT_ROWS = 50_000;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Shared by the paginated list, the CSV export, and (indirectly) the dashboard's client counts. */
export function buildClientsFilterQuery(filters: ClientFiltersInput): QueryFilter<ClientDocument> {
  const query: QueryFilter<ClientDocument> = {};

  if (filters.status) query.status = filters.status;
  if (filters.plan) query.plan = filters.plan;

  if (filters.q) {
    const pattern = new RegExp(escapeRegex(filters.q), "i");
    query.$or = [{ name: pattern }, { company: pattern }, { email: pattern }];
  }

  return query;
}

export interface ClientOption {
  id: string;
  company: string;
}

/** A lightweight `id` + `company` list for the `/admin/payments` client filter dropdown — every client, sorted by company name, never paginated (a filter dropdown needs the whole set). */
export async function listClientOptions(): Promise<ClientOption[]> {
  await connectToDatabase();
  const rows = await Client.find()
    .select({ company: 1 })
    .sort({ company: 1 })
    .lean<{ _id: Types.ObjectId; company: string }[]>();
  return rows.map((row) => ({ id: String(row._id), company: row.company }));
}

export interface ClientListRow {
  id: string;
  name: string;
  company: string;
  email: string;
  plan: ClientDocument["plan"];
  monthlyAmountCents: number;
  status: ClientDocument["status"];
  startDate: Date;
  /** `null` for a non-ACTIVE client — billing isn't running. */
  nextBillingDate: string | null;
  amountCollectedToDateCents: number;
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  );
}

type LeanClientDocument = ClientDocument & { _id: Types.ObjectId };

/** Offset-paginated, newest first. `page`/`pageSize` must already be clamped by the caller. Each row's `amountCollectedToDateCents` and `nextBillingDate` are computed via an aggregation `$lookup` against `payments`, so the list stays a single round trip regardless of page size. */
export async function listClientsPage(
  filters: ClientFiltersInput,
  page: number,
  pageSize: number,
): Promise<{ clients: ClientListRow[]; totalCount: number }> {
  await connectToDatabase();
  const query = buildClientsFilterQuery(filters);
  const skip = (page - 1) * pageSize;

  const [rows, totalCount] = await Promise.all([
    Client.aggregate<LeanClientDocument & { collectedCents: number }>([
      { $match: query },
      { $sort: { createdAt: -1, _id: -1 } },
      { $skip: skip },
      { $limit: pageSize },
      {
        $lookup: {
          from: "payments",
          localField: "_id",
          foreignField: "clientId",
          as: "payments",
        },
      },
      {
        $addFields: {
          collectedCents: { $sum: "$payments.amountCents" },
        },
      },
      { $project: { payments: 0 } },
    ]),
    Client.countDocuments(query),
  ]);

  const clients = rows.map((row) => ({
    id: String(row._id),
    name: row.name,
    company: row.company,
    email: row.email,
    plan: row.plan,
    monthlyAmountCents: row.monthlyAmountCents,
    status: row.status,
    startDate: row.startDate,
    nextBillingDate: row.status === "ACTIVE" ? nextBillingDateInDhaka(row.billingDayOfMonth) : null,
    amountCollectedToDateCents: row.collectedCents,
  }));

  return { clients, totalCount };
}

/** Every filtered row, capped at `MAX_EXPORT_ROWS` — used only by the CSV export, never the paginated list. Same shape as `listClientsPage`'s rows. */
export async function listAllFilteredClients(filters: ClientFiltersInput): Promise<ClientListRow[]> {
  await connectToDatabase();
  const query = buildClientsFilterQuery(filters);

  const rows = await Client.aggregate<LeanClientDocument & { collectedCents: number }>([
    { $match: query },
    { $sort: { createdAt: -1, _id: -1 } },
    { $limit: MAX_EXPORT_ROWS },
    {
      $lookup: { from: "payments", localField: "_id", foreignField: "clientId", as: "payments" },
    },
    { $addFields: { collectedCents: { $sum: "$payments.amountCents" } } },
    { $project: { payments: 0 } },
  ]);

  return rows.map((row) => ({
    id: String(row._id),
    name: row.name,
    company: row.company,
    email: row.email,
    plan: row.plan,
    monthlyAmountCents: row.monthlyAmountCents,
    status: row.status,
    startDate: row.startDate,
    nextBillingDate: row.status === "ACTIVE" ? nextBillingDateInDhaka(row.billingDayOfMonth) : null,
    amountCollectedToDateCents: row.collectedCents,
  }));
}

export type ClientDetail = ClientDocument & { id: string };

function toClientDetail(doc: LeanClientDocument): ClientDetail {
  return { ...doc, id: String(doc._id), notes: doc.notes ?? [] };
}

/** `null` if no document matches `id`. */
export async function findClientById(id: string): Promise<ClientDetail | null> {
  await connectToDatabase();
  const doc = await Client.findById(id).lean<LeanClientDocument | null>();
  if (!doc) return null;
  return toClientDetail(doc);
}

/** `null` if no client is linked to this lead — the lead detail page shows the "Create client" form in that case. */
export async function findClientBySourceInquiryId(inquiryId: string): Promise<ClientDetail | null> {
  await connectToDatabase();
  const doc = await Client.findOne({ sourceInquiryId: inquiryId }).lean<LeanClientDocument | null>();
  if (!doc) return null;
  return toClientDetail(doc);
}

export interface CreateClientResult {
  client: ClientDetail;
  /** `true` if this call found an existing client for `sourceInquiryId` instead of creating a new one — the caller (the Server Action) treats this exactly like a successful create, not an error, per "never create a duplicate, show a link to it instead." */
  alreadyExisted: boolean;
}

/**
 * `sourceInquiryId` is `null` for a standalone "Add client" (referral,
 * LinkedIn, cold email) and a real lead id for the WON-lead conversion
 * form — both paths go through this one function. When `sourceInquiryId`
 * is set, this checks for an existing client first (the common case: the
 * lead detail page only ever renders the create form when none exists),
 * and also catches the unique-index violation from a genuine race (two
 * submits landing concurrently) — either way, it returns the existing
 * client with `alreadyExisted: true` rather than erroring or creating a
 * second document.
 */
export async function createClient(
  input: CreateClientInput,
  sourceInquiryId: string | null,
): Promise<CreateClientResult> {
  await connectToDatabase();

  if (sourceInquiryId) {
    const existing = await findClientBySourceInquiryId(sourceInquiryId);
    if (existing) return { client: existing, alreadyExisted: true };
  }

  try {
    const created = await Client.create({
      name: input.name,
      company: input.company,
      email: input.email,
      website: input.website,
      sourceInquiryId: sourceInquiryId ?? undefined,
      plan: input.plan,
      monthlyAmountCents: input.monthlyAmountCents,
      setupAmountCents: input.setupAmountCents,
      currency: "USD",
      billingDayOfMonth: input.billingDayOfMonth,
      startDate: dhakaDateOnlyToUtcStart(input.startDate),
      status: "ACTIVE",
    });
    return { client: toClientDetail(created.toObject() as LeanClientDocument), alreadyExisted: false };
  } catch (error) {
    if (sourceInquiryId && isDuplicateKeyError(error)) {
      const existing = await findClientBySourceInquiryId(sourceInquiryId);
      if (existing) return { client: existing, alreadyExisted: true };
    }
    throw error;
  }
}

/**
 * Every editable field, replaced in one update — `null` if `id` doesn't
 * match any document. `setupAmountCents`/`endDate` each go into EXACTLY one
 * of `$set`/`$unset`, never both for the same field in the same call —
 * MongoDB rejects an update that references one path from two operators,
 * regardless of the `$set` value, so "clear this optional field" must be an
 * explicit `$unset`, not a `$set` to `undefined`.
 */
export async function updateClient(id: string, input: UpdateClientInput): Promise<ClientDetail | null> {
  await connectToDatabase();

  const setFields: Record<string, unknown> = {
    name: input.name,
    company: input.company,
    email: input.email,
    website: input.website,
    plan: input.plan,
    monthlyAmountCents: input.monthlyAmountCents,
    billingDayOfMonth: input.billingDayOfMonth,
    startDate: dhakaDateOnlyToUtcStart(input.startDate),
    status: input.status,
  };
  const unsetFields: Record<string, ""> = {};

  if (input.setupAmountCents === undefined) {
    unsetFields.setupAmountCents = "";
  } else {
    setFields.setupAmountCents = input.setupAmountCents;
  }

  if (input.endDate === undefined) {
    unsetFields.endDate = "";
  } else {
    setFields.endDate = dhakaDateOnlyToUtcStart(input.endDate);
  }

  const update: Record<string, unknown> = { $set: setFields };
  if (Object.keys(unsetFields).length > 0) update.$unset = unsetFields;

  const doc = await Client.findByIdAndUpdate(id, update, { returnDocument: "after" }).lean<LeanClientDocument | null>();
  if (!doc) return null;
  return toClientDetail(doc);
}

/** Append-only — no edit/delete in this round, same as a lead's notes. `null` if `id` doesn't match any document. */
export async function addClientNote(id: string, text: string): Promise<ClientDetail | null> {
  await connectToDatabase();
  const doc = await Client.findByIdAndUpdate(
    id,
    { $push: { notes: { text, createdAt: new Date() } } },
    { returnDocument: "after" },
  ).lean<LeanClientDocument | null>();
  if (!doc) return null;
  return toClientDetail(doc);
}

export interface ClientCounts {
  active: number;
  paused: number;
  ended: number;
}

/** A snapshot as of now — never scoped to a date range (unlike revenue), since "how many active clients right now" isn't a historical figure. */
export async function getClientCounts(): Promise<ClientCounts> {
  await connectToDatabase();
  const [active, paused, ended] = await Promise.all([
    Client.countDocuments({ status: "ACTIVE" }),
    Client.countDocuments({ status: "PAUSED" }),
    Client.countDocuments({ status: "ENDED" }),
  ]);
  return { active, paused, ended };
}

/** The sum of `monthlyAmountCents` across every `ACTIVE` client — committed recurring revenue, NOT collected cash. Plain integer addition (via `$sum` in the aggregation, which MongoDB computes exactly for integers), never a float. */
export async function getCurrentMrrCents(): Promise<number> {
  await connectToDatabase();
  const [result] = await Client.aggregate<{ total: number }>([
    { $match: { status: "ACTIVE" } },
    { $group: { _id: null, total: { $sum: "$monthlyAmountCents" } } },
  ]);
  return result?.total ?? 0;
}
