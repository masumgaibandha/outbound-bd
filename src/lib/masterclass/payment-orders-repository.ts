import type { ClientSession, Collection, ObjectId, UpdateResult } from "mongodb";

import {
  DuplicateTransactionError,
  IdempotencyConflictError,
  OrderNotEditableError,
} from "@/lib/masterclass/errors";
import { computeOrderFingerprint } from "@/lib/masterclass/fingerprint";
import { getDb } from "@/lib/masterclass/db";
import { generatePublicOrderRef } from "@/lib/masterclass/refs";
import type {
  AttributionSnapshot,
  DeliveryState,
  ManualPaymentMethod,
  PaymentOrderDocument,
  PaymentOrderStatus,
} from "@/types/masterclass-persistence";

/** Ported verbatim (logic unchanged) from the MasumDev masterclass source — only the `getDb()` import path changed. */
export const PAYMENT_ORDERS_COLLECTION = "payment_orders";

let indexesEnsured: Promise<void> | undefined;

async function ensureIndexes(
  collection: Collection<PaymentOrderDocument>,
): Promise<void> {
  indexesEnsured ??= (async () => {
    await Promise.all([
      collection.createIndex(
        { publicOrderRef: 1 },
        { unique: true, name: "uniq_public_order_ref" },
      ),
      collection.createIndex(
        { batchId: 1, idempotencyKey: 1 },
        { unique: true, name: "uniq_batch_idempotency_key" },
      ),
      collection.createIndex(
        { registrationId: 1, createdAt: 1 },
        { name: "registration_created" },
      ),
      /*
       * Enforces "at most one active-or-paid order per registration" at the
       * database level — the fix for a real bug found during the Batch 1
       * launch audit: a repeated registration (same email/phone, a *new*
       * Idempotency-Key) matched the existing registration but fell through
       * to `insertOne` in `createDraftOrder` and created a second `PENDING`
       * order, because the old uniqueness guarantee was keyed only on
       * `(batchId, idempotencyKey)`, never on `registrationId`.
       *
       * This can't be `{ registrationId: 1 }` with
       * `partialFilterExpression: { status: { $in: [...] } }` — MongoDB
       * partial-index filters only support equality, `$exists`, `$gt(e)`,
       * `$lt(e)`, `$type`, and top-level `$and`; `$in`/`$or` are rejected at
       * index-creation time. `activeOrderLock` is a derived marker field
       * (see its doc comment in `masterclass-persistence.ts`) maintained
       * only so this index has a single equality condition to filter on.
       */
      collection.createIndex(
        { registrationId: 1 },
        {
          unique: true,
          name: "uniq_active_or_paid_order_per_registration",
          partialFilterExpression: { activeOrderLock: { $exists: true } },
        },
      ),
      collection.createIndex(
        { status: 1, updatedAt: 1 },
        { name: "status_updated" },
      ),
      collection.createIndex(
        { provider: 1, providerTransactionId: 1 },
        {
          unique: true,
          name: "uniq_provider_transaction",
          partialFilterExpression: { providerTransactionId: { $type: "string" } },
        },
      ),
      collection.createIndex(
        { "manualPayment.transactionIdNormalized": 1 },
        {
          unique: true,
          name: "uniq_manual_transaction_id",
          partialFilterExpression: {
            "manualPayment.transactionIdNormalized": { $type: "string" },
          },
        },
      ),
      collection.createIndex(
        { status: 1, createdAt: 1 },
        { name: "status_created" },
      ),
      /* Non-unique — a lookup aid, never a uniqueness guarantee (one student can have several orders across batches). */
      collection.createIndex({ studentId: 1 }, { name: "student_id_lookup" }),
    ]);
  })();
  return indexesEnsured;
}

async function getCollection(): Promise<Collection<PaymentOrderDocument>> {
  const db = await getDb();
  const collection = db.collection<PaymentOrderDocument>(PAYMENT_ORDERS_COLLECTION);
  await ensureIndexes(collection);
  return collection;
}

export interface CreateDraftOrderInput {
  registrationId: ObjectId;
  masterclassSlug: string;
  batchId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
  attribution: AttributionSnapshot;
  clientIpAddress: string | null;
  clientUserAgent: string | null;
}

/**
 * Exported (rather than kept module-private, as `registrations-repository.ts`
 * does with its own copy) because `registration-service.ts` needs it too —
 * see the retry comment on `registerForMasterclass()` for why.
 */
export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  );
}

function freshDeliveryState(): DeliveryState {
  return {
    status: "NOT_READY",
    attempts: 0,
    processingToken: null,
    processingStartedAt: null,
    leaseExpiresAt: null,
    lastAttemptAt: null,
    sentAt: null,
    lastErrorCode: null,
  };
}

/**
 * `rejectionEmail` did not exist before this feature — Production has
 * documents rejected earlier that have no such field at all in the actual
 * stored document (TypeScript's `PaymentOrderDocument` type is not enforced
 * against pre-existing data). Every reader of `order.rejectionEmail` must go
 * through this rather than touching the field directly, so a legacy
 * document reads as "never attempted" (matching what genuinely happened —
 * no rejection email was ever sent for it) instead of throwing. Purely an
 * in-memory default: never writes anything back to the document, and never
 * bulk-migrates existing Production records.
 */
export function getRejectionEmailState(
  order: Pick<PaymentOrderDocument, "rejectionEmail">,
): DeliveryState {
  return order.rejectionEmail ?? freshDeliveryState();
}

function assertSameRequest(
  existing: PaymentOrderDocument,
  registrationId: ObjectId,
  fingerprint: string,
): void {
  if (!existing.registrationId.equals(registrationId) || existing.requestFingerprint !== fingerprint) {
    throw new IdempotencyConflictError();
  }
}

/**
 * Why a request reused an existing order rather than creating a new one —
 * `"created"` is the only case where a brand-new document was inserted.
 * `wasExisting` (kept for compatibility with existing callers/tests) is
 * simply `reason !== "created"`.
 */
export type CreateDraftOrderReason = "created" | "idempotent_replay" | "active_order_reuse";

async function findActiveOrPaidOrderForRegistration(
  collection: Collection<PaymentOrderDocument>,
  registrationId: ObjectId,
  session: ClientSession | undefined,
): Promise<PaymentOrderDocument | null> {
  return collection.findOne({ registrationId, activeOrderLock: true }, { session });
}

/**
 * One draft order per `(batchId, idempotencyKey)`, AND at most one
 * active-or-paid (`PENDING`/`REVIEW`/`PAID`) order per registration:
 *
 * 1. Same `(batchId, idempotencyKey)` as a prior call → return that exact
 *    order untouched (true idempotent replay), but only when it was created
 *    for the same registration and the same (amount, currency) request.
 * 2. A *different* idempotency key, but the registration already has an
 *    active-or-paid order (e.g. a resubmitted form after a network error,
 *    or — deliberately — a repeat "registration" for an already-`PAID`
 *    registration) → reuse that existing order rather than opening a
 *    second one. This is the fix for the duplicate-active-order bug: the
 *    old implementation only de-duplicated on the idempotency key, so a
 *    new key for the same registration fell through to `insertOne` and
 *    created a second `PENDING` order.
 * 3. Otherwise → insert a new `PENDING` draft.
 *
 * Never marks anything paid. Race-safe under concurrent requests via two
 * partial unique indexes (`uniq_batch_idempotency_key` and
 * `uniq_active_or_paid_order_per_registration`) — a losing concurrent
 * insert re-reads and returns whichever order actually won, rather than
 * relying only on the find-then-insert checks above.
 */
export async function createDraftOrder(
  input: CreateDraftOrderInput,
  session?: ClientSession,
): Promise<{ order: PaymentOrderDocument; wasExisting: boolean; reason: CreateDraftOrderReason }> {
  const collection = await getCollection();
  const fingerprint = computeOrderFingerprint({
    batchId: input.batchId,
    registrationId: input.registrationId,
    amount: input.amount,
    currency: input.currency,
  });

  const existingByKey = await collection.findOne(
    { batchId: input.batchId, idempotencyKey: input.idempotencyKey },
    { session },
  );
  if (existingByKey) {
    assertSameRequest(existingByKey, input.registrationId, fingerprint);
    return { order: existingByKey, wasExisting: true, reason: "idempotent_replay" };
  }

  const blockingOrder = await findActiveOrPaidOrderForRegistration(collection, input.registrationId, session);
  if (blockingOrder) {
    return { order: blockingOrder, wasExisting: true, reason: "active_order_reuse" };
  }

  const now = new Date();
  const publicOrderRef = generatePublicOrderRef();

  const draft: PaymentOrderDocument = {
    publicOrderRef,
    registrationId: input.registrationId,
    masterclassSlug: input.masterclassSlug,
    batchId: input.batchId,
    amount: input.amount,
    currency: input.currency,
    status: "PENDING",
    provider: "MANUAL",
    method: null,
    manualPayment: null,
    verifiedAt: null,
    verifiedBy: null,
    rejectedReason: null,
    activeOrderLock: true,
    idempotencyKey: input.idempotencyKey,
    requestFingerprint: fingerprint,
    providerTransactionId: null,
    providerPaymentId: null,
    attribution: input.attribution,
    clientContext: {
      clientIpAddress: input.clientIpAddress,
      clientUserAgent: input.clientUserAgent,
    },
    metaEventIds: {
      initiateCheckout: null,
      purchase: `purchase_${publicOrderRef}`,
    },
    confirmationEmail: freshDeliveryState(),
    purchaseCapi: freshDeliveryState(),
    rejectionEmail: freshDeliveryState(),
    createdAt: now,
    updatedAt: now,
  };

  try {
    await collection.insertOne(draft, { session });
    return { order: draft, wasExisting: false, reason: "created" };
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;

    if (session) {
      // Inside a transaction, this write error has already aborted the
      // entire transaction server-side (confirmed empirically against a
      // real replica set: any write error poisons the whole
      // multi-document transaction, and every later operation on this same
      // session — even a plain read — then fails with `NoSuchTransaction`,
      // not the winning document). So unlike the session-less path below,
      // this never re-reads on `session`. The raw duplicate-key error is
      // rethrown unchanged; `registerForMasterclass()`'s outer retry loop
      // recognizes it via `isDuplicateKeyError()` and retries the whole
      // operation with a brand-new session/transaction, whose own fresh
      // leading read sees the now-committed winner cleanly.
      throw error;
    }

    // No transaction here — this session-less call is free to look again.
    const winnerByKey = await collection.findOne({
      batchId: input.batchId,
      idempotencyKey: input.idempotencyKey,
    });
    if (winnerByKey) {
      assertSameRequest(winnerByKey, input.registrationId, fingerprint);
      return { order: winnerByKey, wasExisting: true, reason: "idempotent_replay" };
    }

    const winnerByRegistration = await findActiveOrPaidOrderForRegistration(
      collection,
      input.registrationId,
      undefined,
    );
    if (winnerByRegistration) {
      return { order: winnerByRegistration, wasExisting: true, reason: "active_order_reuse" };
    }

    throw error;
  }
}

export async function findOrderByPublicRef(
  publicOrderRef: string,
): Promise<PaymentOrderDocument | null> {
  const collection = await getCollection();
  return collection.findOne({ publicOrderRef });
}

/** Trim + uppercase — bKash/Nagad/Rocket TxIDs are alphanumeric and students copy-paste them inconsistently. */
export function normalizeTransactionId(raw: string): string {
  return raw.trim().toUpperCase();
}

export interface SubmitManualPaymentInput {
  publicOrderRef: string;
  method: ManualPaymentMethod;
  /** Mobile-wallet methods only — `null`/omitted for `BANK`. */
  senderNumber?: string | null;
  /** `BANK` only — the name on the sending bank account. */
  payerName?: string | null;
  /** `BANK` only, optional — the student's own bank, if shared. */
  senderBankName?: string | null;
  transactionIdRaw: string;
}

/**
 * Records the student's manual-payment evidence and moves the order to
 * `REVIEW`. Never sets `PAID`. Allowed from `PENDING` or `REVIEW`; once
 * `PAID`/`REJECTED`/`CANCELLED` this throws `OrderNotEditableError`. A
 * normalized TxID collision with a different order throws
 * `DuplicateTransactionError` — enforced by the same `uniq_manual_transaction_id`
 * index regardless of which manual method (bKash/Nagad/Rocket/bank) the
 * order used, so duplicate protection is never per-method.
 */
export async function submitManualPayment(
  input: SubmitManualPaymentInput,
): Promise<PaymentOrderDocument> {
  const collection = await getCollection();
  const transactionIdNormalized = normalizeTransactionId(input.transactionIdRaw);
  const now = new Date();

  try {
    const updated = await collection.findOneAndUpdate(
      { publicOrderRef: input.publicOrderRef, status: { $in: ["PENDING", "REVIEW"] } },
      {
        $set: {
          status: "REVIEW",
          method: input.method,
          manualPayment: {
            senderNumber: input.senderNumber ?? null,
            payerName: input.payerName ?? null,
            senderBankName: input.senderBankName ?? null,
            transactionIdRaw: input.transactionIdRaw,
            transactionIdNormalized,
            submittedAt: now,
          },
          updatedAt: now,
        },
      },
      { returnDocument: "after" },
    );

    if (!updated) throw new OrderNotEditableError();

    return updated;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new DuplicateTransactionError();
    }
    throw error;
  }
}

export interface VerifyPaymentInput {
  publicOrderRef: string;
  /** Opaque operator identifier (the Basic Auth username) — never a display name. */
  verifiedBy: string;
}

/**
 * `REVIEW → PAID`, guarded atomically by the `status: "REVIEW"` filter — a
 * second concurrent approval matches nothing and returns `null` rather than
 * double-processing. Deliberately does NOT touch `activeOrderLock`: `PAID`
 * is still an active-or-paid state (see the doc comment on that field), so
 * a further registration attempt for this student keeps resolving to this
 * same paid order instead of opening a new one — there is no product
 * concept of "buy a second seat" today.
 */
export async function verifyPayment(
  input: VerifyPaymentInput,
  session?: ClientSession,
): Promise<PaymentOrderDocument | null> {
  const collection = await getCollection();
  const now = new Date();
  return collection.findOneAndUpdate(
    { publicOrderRef: input.publicOrderRef, status: "REVIEW" },
    { $set: { status: "PAID", verifiedAt: now, verifiedBy: input.verifiedBy, updatedAt: now } },
    { returnDocument: "after", session },
  );
}

/**
 * Sets `studentId` on exactly the one order being approved right now.
 * Returns the raw `UpdateResult` so the caller can verify
 * `matchedCount === 1` inside the approval transaction.
 */
export async function linkOrderToStudent(
  orderId: NonNullable<PaymentOrderDocument["_id"]>,
  studentId: ObjectId,
  session?: ClientSession,
): Promise<UpdateResult> {
  const collection = await getCollection();
  return collection.updateOne(
    { _id: orderId },
    { $set: { studentId, updatedAt: new Date() } },
    { session },
  );
}

export interface RejectPaymentInput {
  publicOrderRef: string;
  verifiedBy: string;
  reason: string | null;
}

/**
 * `REVIEW → REJECTED`, same atomic guard as `verifyPayment()`. Clears
 * `activeOrderLock` so this registration is no longer considered to have an
 * active-or-paid order — the product decision (see the duplicate-order fix)
 * is that a rejected payment must let the student try again, so the next
 * registration/payment attempt is free to open a new draft order instead of
 * being blocked by this now-dead one.
 */
export async function rejectPayment(input: RejectPaymentInput): Promise<PaymentOrderDocument | null> {
  const collection = await getCollection();
  const now = new Date();
  return collection.findOneAndUpdate(
    { publicOrderRef: input.publicOrderRef, status: "REVIEW" },
    {
      $set: {
        status: "REJECTED",
        verifiedAt: now,
        verifiedBy: input.verifiedBy,
        rejectedReason: input.reason,
        updatedAt: now,
      },
      $unset: { activeOrderLock: "" },
    },
    { returnDocument: "after" },
  );
}

/**
 * Records the outcome of an attempted confirmation-email, Meta-CAPI, or
 * rejection-email send. Never touches `status` — a failed send here can
 * never undo `PAID` or `REJECTED`.
 */
export async function updateDeliveryState(
  publicOrderRef: string,
  field: "confirmationEmail" | "purchaseCapi" | "rejectionEmail",
  outcome: { ok: true } | { ok: false; errorCode: string },
): Promise<void> {
  const collection = await getCollection();
  const now = new Date();

  if (outcome.ok) {
    await collection.updateOne(
      { publicOrderRef },
      {
        $set: {
          [`${field}.status`]: "SENT",
          [`${field}.sentAt`]: now,
          [`${field}.lastAttemptAt`]: now,
          [`${field}.lastErrorCode`]: null,
          updatedAt: now,
        },
        $inc: { [`${field}.attempts`]: 1 },
      },
    );
    return;
  }

  await collection.updateOne(
    { publicOrderRef },
    {
      $set: {
        [`${field}.status`]: "FAILED",
        [`${field}.lastAttemptAt`]: now,
        [`${field}.lastErrorCode`]: outcome.errorCode,
        updatedAt: now,
      },
      $inc: { [`${field}.attempts`]: 1 },
    },
  );
}

/** Lean shape for the admin queue — never a full document dump, and never registration-side secrets. */
export interface AdminReviewOrder {
  publicOrderRef: string;
  publicRegistrationRef: string;
  name: string;
  email: string;
  phone: string;
  method: ManualPaymentMethod | null;
  amount: number;
  currency: string;
  manualPayment: PaymentOrderDocument["manualPayment"];
  attributionSource: string | null;
  createdAt: Date;
}

export interface ListOrdersForReviewResult {
  orders: AdminReviewOrder[];
  /** Pass back as `cursor` to fetch the next page; `null` when this was the last page. */
  nextCursor: string | null;
}

const REVIEW_PAGE_SIZE = 25;

/** Oldest-first, cursor-paginated. Joins in just the registration fields an operator needs to verify a payment. */
export async function listOrdersForReview(cursor?: string): Promise<ListOrdersForReviewResult> {
  const collection = await getCollection();

  const match: Record<string, unknown> = { status: "REVIEW" };
  if (cursor) {
    const [createdAtIso, id] = cursor.split("|");
    match.$or = [
      { createdAt: { $gt: new Date(createdAtIso) } },
      { createdAt: new Date(createdAtIso), _id: { $gt: id } },
    ];
  }

  const docs = await collection
    .aggregate<{
      publicOrderRef: string;
      method: ManualPaymentMethod | null;
      amount: number;
      currency: string;
      manualPayment: PaymentOrderDocument["manualPayment"];
      createdAt: Date;
      _id: ObjectId;
      registration: { publicRegistrationRef: string; name: string; email: string; phone: string }[];
      attribution: { utmSource?: string } | null;
    }>([
      { $match: match },
      { $sort: { createdAt: 1, _id: 1 } },
      { $limit: REVIEW_PAGE_SIZE },
      {
        $lookup: {
          from: "masterclass_registrations",
          localField: "registrationId",
          foreignField: "_id",
          as: "registration",
        },
      },
      {
        $project: {
          publicOrderRef: 1,
          method: 1,
          amount: 1,
          currency: 1,
          manualPayment: 1,
          createdAt: 1,
          attribution: "$attribution",
          "registration.publicRegistrationRef": 1,
          "registration.name": 1,
          "registration.email": 1,
          "registration.phone": 1,
        },
      },
    ])
    .toArray();

  const orders: AdminReviewOrder[] = docs
    .filter((doc) => doc.registration.length > 0)
    .map((doc) => ({
      publicOrderRef: doc.publicOrderRef,
      publicRegistrationRef: doc.registration[0].publicRegistrationRef,
      name: doc.registration[0].name,
      email: doc.registration[0].email,
      phone: doc.registration[0].phone,
      method: doc.method,
      amount: doc.amount,
      currency: doc.currency,
      manualPayment: doc.manualPayment,
      attributionSource: doc.attribution?.utmSource ?? null,
      createdAt: doc.createdAt,
    }));

  const last = docs.at(-1);
  const nextCursor =
    docs.length === REVIEW_PAGE_SIZE && last ? `${last.createdAt.toISOString()}|${last._id.toHexString()}` : null;

  return { orders, nextCursor };
}

/** Derived purely from `status` — never from a public reference, an ID's shape, or a count of generated IDs. */
export async function countOrdersByStatus(status: PaymentOrderStatus): Promise<number> {
  const collection = await getCollection();
  return collection.countDocuments({ status });
}
