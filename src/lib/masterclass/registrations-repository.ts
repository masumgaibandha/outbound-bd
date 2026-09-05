import type { ClientSession, Collection } from "mongodb";

import { getDb } from "@/lib/masterclass/db";
import { policyVersions } from "@/lib/masterclass/constants";
import { PublicReferenceCollisionError, RegistrationConflictError } from "@/lib/masterclass/errors";
import { generateRandomRegistrationRef } from "@/lib/masterclass/refs";
import type {
  AttributionSnapshot,
  RegistrationDocument,
} from "@/types/masterclass-persistence";

/** Ported verbatim (logic unchanged) from the MasumDev masterclass source — only the `getDb()` import path changed. */
export const REGISTRATIONS_COLLECTION = "masterclass_registrations";

let indexesEnsured: Promise<void> | undefined;

async function ensureIndexes(
  collection: Collection<RegistrationDocument>,
): Promise<void> {
  indexesEnsured ??= (async () => {
    await Promise.all([
      collection.createIndex(
        { batchId: 1, emailNormalized: 1 },
        { unique: true, name: "uniq_batch_email" },
      ),
      collection.createIndex(
        { publicRegistrationRef: 1 },
        { unique: true, name: "uniq_public_registration_ref" },
      ),
    ]);
  })();
  return indexesEnsured;
}

async function getCollection(): Promise<Collection<RegistrationDocument>> {
  const db = await getDb();
  const collection = db.collection<RegistrationDocument>(REGISTRATIONS_COLLECTION);
  await ensureIndexes(collection);
  return collection;
}

export interface UpsertRegistrationInput {
  masterclassSlug: string;
  batchId: string;
  name: string;
  email: string;
  emailNormalized: string;
  phone: string;
  phoneE164: string;
  marketingConsent: boolean;
  attribution: AttributionSnapshot;
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  );
}

/**
 * Classifies a duplicate-key error by the MongoDB driver's own
 * `keyPattern` (confirmed empirically against a real replica set: a
 * `publicRegistrationRef` collision reports `keyPattern: { publicRegistrationRef: 1 }`,
 * distinct from a `(batchId, emailNormalized)` collision's
 * `{ batchId: 1, emailNormalized: 1 }`) — never inferred by re-reading the
 * database, since any read on the same session after this error fails (see
 * `PublicReferenceCollisionError`'s doc comment). Falls back to the error
 * message's index name if `keyPattern` is ever absent on some driver path,
 * rather than silently misclassifying an unrelated duplicate-key error as a
 * reference collision.
 */
function isPublicReferenceCollision(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const keyPattern = (error as { keyPattern?: unknown }).keyPattern;
  if (keyPattern && typeof keyPattern === "object" && "publicRegistrationRef" in keyPattern) {
    return true;
  }
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message.includes("uniq_public_registration_ref");
}

/** Only `updatedAt`/`lastTouchAttribution` change on a matched retry — nothing identity- or consent-related. */
async function applyMatchedRetry(
  collection: Collection<RegistrationDocument>,
  existing: RegistrationDocument,
  attribution: AttributionSnapshot,
  session: ClientSession | undefined,
): Promise<RegistrationDocument> {
  const updated = await collection.findOneAndUpdate(
    { _id: existing._id },
    { $set: { updatedAt: new Date(), lastTouchAttribution: attribution } },
    { returnDocument: "after", session },
  );
  if (!updated) {
    throw new Error("Registration disappeared during a retry update.");
  }
  return updated;
}

/**
 * One registration per `(batchId, emailNormalized)`, with identity and
 * consent treated as immutable after creation:
 *
 * - No existing document for this batch/email → insert a new one, with a
 *   freshly generated random `publicRegistrationRef`.
 * - An existing document whose `phoneE164` matches the submitted phone →
 *   treated as the same student retrying. Only `updatedAt` and
 *   `lastTouchAttribution` are touched.
 * - An existing document whose `phoneE164` does NOT match → throws
 *   `RegistrationConflictError` (the caller turns this into a generic 409).
 *
 * Makes exactly ONE insert attempt per call — never loops or re-reads inside
 * a transaction that a write error may already have aborted. Confirmed
 * empirically against a real MongoDB replica set: once any write inside a
 * multi-document transaction fails (including an ordinary duplicate-key
 * error), the ENTIRE transaction is aborted server-side, and every later
 * operation on that same session — even a plain read — fails with
 * `NoSuchTransaction: Transaction ... has been aborted`. So on a duplicate
 * key error here, this function does not attempt any further read on
 * `session`; it just classifies which unique index was violated (via the
 * driver's own `keyPattern`, never a fragile re-read) and throws:
 *
 * - `PublicReferenceCollisionError` if the collision is on
 *   `publicRegistrationRef` — signals `registerForMasterclass()`
 *   (`registration-service.ts`) to retry the whole transaction with a
 *   brand-new session (bounded there, never here).
 * - The raw duplicate-key error otherwise (i.e. the `(batchId,
 *   emailNormalized)` index) — `registerForMasterclass()`'s existing
 *   fresh-session retry already handles this case correctly, because the
 *   retry's own leading `findOne` above runs in an *unpoisoned* transaction
 *   and finds the concurrent winner there.
 */
export async function upsertRegistration(
  input: UpsertRegistrationInput,
  session?: ClientSession,
): Promise<RegistrationDocument> {
  const collection = await getCollection();
  const now = new Date();

  const existing = await collection.findOne(
    { batchId: input.batchId, emailNormalized: input.emailNormalized },
    { session },
  );

  if (existing) {
    if (existing.phoneE164 !== input.phoneE164) {
      throw new RegistrationConflictError();
    }
    return applyMatchedRetry(collection, existing, input.attribution, session);
  }

  const publicRegistrationRef = generateRandomRegistrationRef(now.getFullYear());

  const doc: RegistrationDocument = {
    publicRegistrationRef,
    masterclassSlug: input.masterclassSlug,
    batchId: input.batchId,
    name: input.name,
    email: input.email,
    emailNormalized: input.emailNormalized,
    phone: input.phone,
    phoneE164: input.phoneE164,
    status: "PENDING_PAYMENT",
    consent: {
      accepted: true,
      privacyPolicyVersion: policyVersions.privacy,
      termsVersion: policyVersions.terms,
      refundPolicyVersion: policyVersions.refund,
      acceptedAt: now,
      marketingConsent: input.marketingConsent,
    },
    firstTouchAttribution: input.attribution,
    lastTouchAttribution: input.attribution,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await collection.insertOne(doc, { session });
    return doc;
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    if (isPublicReferenceCollision(error)) {
      throw new PublicReferenceCollisionError();
    }
    throw error;
  }
}

/** Total registrations ever created for this masterclass, across every batch — derived from the collection, never from an ID or a counter. */
export async function countTotalRegistrations(): Promise<number> {
  const collection = await getCollection();
  return collection.countDocuments({});
}

/** Only registrations whose status has actually reached `ENROLLED` (set by `markRegistrationEnrolled()` at `REVIEW → PAID`) — never a raw count of generated IDs or orders. */
export async function countEnrolledRegistrations(): Promise<number> {
  const collection = await getCollection();
  return collection.countDocuments({ status: "ENROLLED" });
}

export async function findRegistrationByPublicRef(
  publicRegistrationRef: string,
): Promise<RegistrationDocument | null> {
  const collection = await getCollection();
  return collection.findOne({ publicRegistrationRef });
}

export async function findRegistrationById(
  registrationId: RegistrationDocument["_id"],
): Promise<RegistrationDocument | null> {
  const collection = await getCollection();
  return collection.findOne({ _id: registrationId });
}

/** Called only from `verify-service.ts` immediately after an order reaches `PAID`. */
export async function markRegistrationEnrolled(
  registrationId: RegistrationDocument["_id"],
): Promise<void> {
  const collection = await getCollection();
  await collection.updateOne(
    { _id: registrationId },
    { $set: { status: "ENROLLED", updatedAt: new Date() } },
  );
}
