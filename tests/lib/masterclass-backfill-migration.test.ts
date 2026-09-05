// Must be the first import — sets MONGODB_URI to an isolated in-memory
// instance before mongoose.ts / any masterclass module is imported. The
// migration itself never uses a multi-document transaction, so the
// standalone (non-replica-set) helper is sufficient and faster.
import { mongod } from "../helpers/mongodb-memory-server";

import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import type { Db } from "mongodb";

import { connectToDatabase } from "@/lib/mongoose";
import {
  prepareIndexesForApply,
  REQUIRED_MIGRATION_INDEXES,
  runBackfillStudents,
} from "../../scripts/migrations/0001-backfill-students";

async function getDb() {
  const connection = await connectToDatabase();
  const db = connection.connection.db;
  if (!db) throw new Error("no db");
  return db;
}

const NO_OP_LOG = { info: () => {}, warn: () => {} };

interface RawRegistrationOverrides {
  _id?: ObjectId;
  name?: string;
  email?: string;
  emailNormalized?: string;
  phone?: string;
  phoneE164?: string;
  status?: string;
  updatedAt?: Date;
  createdAt?: Date;
  studentId?: ObjectId;
}

function rawRegistration(overrides: RawRegistrationOverrides = {}): { _id: ObjectId } & Record<string, unknown> {
  const now = new Date();
  const doc: { _id: ObjectId } & Record<string, unknown> = {
    _id: overrides._id ?? new ObjectId(),
    publicRegistrationRef: `MC-2026-${new ObjectId().toHexString().slice(0, 8).toUpperCase()}`,
    masterclassSlug: "lead-generation-cold-email",
    batchId: "lead-generation-cold-email-2026-10",
    name: overrides.name ?? "Test Student",
    email: overrides.email ?? "student@example.com",
    emailNormalized: overrides.emailNormalized ?? overrides.email ?? "student@example.com",
    phone: overrides.phone ?? "01712345678",
    phoneE164: overrides.phoneE164 ?? "+8801712345678",
    status: overrides.status ?? "ENROLLED",
    consent: {
      accepted: true,
      privacyPolicyVersion: "2026-08-18",
      termsVersion: "2026-09-03",
      refundPolicyVersion: "2026-08-09",
      acceptedAt: now,
      marketingConsent: false,
    },
    firstTouchAttribution: { capturedAt: now },
    lastTouchAttribution: { capturedAt: now },
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
  if (overrides.studentId) doc.studentId = overrides.studentId;
  return doc;
}

function rawOrder(
  registrationId: ObjectId,
  overrides: { status?: string; studentId?: ObjectId } = {},
): { _id: ObjectId } & Record<string, unknown> {
  const now = new Date();
  const doc: { _id: ObjectId } & Record<string, unknown> = {
    _id: new ObjectId(),
    publicOrderRef: `ord_${new ObjectId().toHexString()}`,
    registrationId,
    masterclassSlug: "lead-generation-cold-email",
    batchId: "lead-generation-cold-email-2026-10",
    amount: 1499,
    currency: "BDT",
    status: overrides.status ?? "PAID",
    provider: "MANUAL",
    method: "BKASH",
    manualPayment: null,
    idempotencyKey: new ObjectId().toHexString(),
    requestFingerprint: "test-fingerprint",
    providerTransactionId: null,
    providerPaymentId: null,
    attribution: { capturedAt: now },
    clientContext: { clientIpAddress: null, clientUserAgent: null },
    metaEventIds: { initiateCheckout: null, purchase: "purchase_test" },
    confirmationEmail: { status: "SENT", attempts: 1, processingToken: null, processingStartedAt: null, leaseExpiresAt: null, lastAttemptAt: now, sentAt: now, lastErrorCode: null },
    purchaseCapi: { status: "FAILED", attempts: 1, processingToken: null, processingStartedAt: null, leaseExpiresAt: null, lastAttemptAt: now, sentAt: null, lastErrorCode: "CAPI_NOT_CONFIGURED" },
    rejectionEmail: { status: "NOT_READY", attempts: 0, processingToken: null, processingStartedAt: null, leaseExpiresAt: null, lastAttemptAt: null, sentAt: null, lastErrorCode: null },
    verifiedAt: now,
    verifiedBy: "admin",
    rejectedReason: null,
    createdAt: now,
    updatedAt: now,
  };
  if (overrides.studentId) doc.studentId = overrides.studentId;
  return doc;
}

async function snapshotDatabase() {
  const db = await getDb();
  const collectionInfos = await db.listCollections().toArray();
  const names = collectionInfos.map((c) => c.name).sort();

  const indexesByCollection: Record<string, string[]> = {};
  const documentsByCollection: Record<string, unknown[]> = {};
  for (const name of names) {
    const indexes = await db.collection(name).indexes();
    indexesByCollection[name] = indexes.map((idx) => idx.name ?? "").sort();
    documentsByCollection[name] = await db.collection(name).find({}).sort({ _id: 1 }).toArray();
  }

  return { names, indexesByCollection, documentsByCollection };
}

/**
 * Drops every collection outright (not just its documents) so each test
 * starts with a truly clean slate — including no leftover indexes. This
 * matters once index creation itself is under test: a plain `deleteMany`
 * would empty documents but leave an index created by a *previous* test
 * still in place, silently masking whether the *current* test's own
 * `runBackfillStudents` call actually created it.
 */
async function clearAllCollections() {
  const db = await getDb();
  const existing = await db.listCollections().toArray();
  await Promise.all(existing.map((c) => db.dropCollection(c.name)));
}

const WRITE_METHODS = new Set([
  "insertOne",
  "insertMany",
  "updateOne",
  "updateMany",
  "findOneAndUpdate",
  "deleteOne",
  "deleteMany",
]);

/**
 * Wraps a real `Db` so every `createIndex` and document-write call made
 * through it (on any collection) is recorded, in order, into `callLog`.
 * Used only to prove ordering ("indexes exist before the first write") —
 * every underlying operation still runs against the real in-memory
 * database; nothing here fakes MongoDB's own behavior.
 */
function instrumentDb(realDb: Db, callLog: string[]): Db {
  return new Proxy(realDb, {
    get(target, prop, receiver) {
      if (prop === "collection") {
        return (name: string, ...rest: unknown[]) => {
          const realCollection = (target.collection as (...a: unknown[]) => unknown)(name, ...rest);
          return new Proxy(realCollection as object, {
            get(collTarget, methodProp, collReceiver) {
              const original = Reflect.get(collTarget, methodProp, collReceiver);
              const methodName = String(methodProp);
              if (typeof original === "function" && (methodName === "createIndex" || WRITE_METHODS.has(methodName))) {
                return (...args: unknown[]) => {
                  callLog.push(`${name}.${methodName}`);
                  return (original as (...a: unknown[]) => unknown).apply(collTarget, args);
                };
              }
              return typeof original === "function" ? original.bind(collTarget) : original;
            },
          });
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  }) as Db;
}

beforeEach(async () => {
  await connectToDatabase();
  await clearAllCollections();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("runBackfillStudents — dry run is genuinely read-only", () => {
  it("leaves collections, indexes, and every document byte-identical", async () => {
    const db = await getDb();
    await db.collection("masterclass_registrations").insertMany([
      rawRegistration({ email: "a@example.com" }),
      rawRegistration({ email: "b@example.com" }),
    ]);

    const before = await snapshotDatabase();
    const summary = await runBackfillStudents(db, { apply: false }, NO_OP_LOG);
    const after = await snapshotDatabase();

    expect(summary.apply).toBe(false);
    expect(after).toEqual(before);
  });

  it("never causes masterclass_students to spring into existence, even though it reads from it", async () => {
    const db = await getDb();
    await db.collection("masterclass_registrations").insertOne(rawRegistration());

    await runBackfillStudents(db, { apply: false }, NO_OP_LOG);

    const collectionNames = (await db.listCollections().toArray()).map((c) => c.name);
    expect(collectionNames).not.toContain("masterclass_students");
  });

  it("creates no index anywhere — a query against a collection with zero indexes never auto-creates one", async () => {
    const db = await getDb();
    await db.collection("masterclass_registrations").insertOne(rawRegistration());

    const indexesBefore = await db.collection("masterclass_registrations").indexes();
    await runBackfillStudents(db, { apply: false }, NO_OP_LOG);
    const indexesAfter = await db.collection("masterclass_registrations").indexes();

    expect(indexesAfter).toEqual(indexesBefore);
  });

  it("prints no name, email, or phone number", async () => {
    const db = await getDb();
    await db.collection("masterclass_registrations").insertOne(
      rawRegistration({ name: "Very Unique Name Xyz", email: "unique-secret@example.com", phone: "01799998888" }),
    );

    const logged: string[] = [];
    await runBackfillStudents(db, { apply: false }, { info: (m) => logged.push(m), warn: (m) => logged.push(m) });

    const combined = logged.join("\n");
    expect(combined).not.toContain("Very Unique Name Xyz");
    expect(combined).not.toContain("unique-secret@example.com");
    expect(combined).not.toContain("01799998888");
  });

  it("reports wouldCreate/wouldReuse without writing anything", async () => {
    const db = await getDb();
    await db.collection("masterclass_registrations").insertOne(rawRegistration({ email: "fresh@example.com" }));

    const summary = await runBackfillStudents(db, { apply: false }, NO_OP_LOG);
    expect(summary.wouldCreate).toBe(1);
    expect(summary.wouldReuse).toBe(0);
    expect(await db.collection("masterclass_students").countDocuments({}).catch(() => 0)).toBe(0);
  });
});

describe("runBackfillStudents — apply mode (in-memory only, never Production)", () => {
  it("selects the canonical name/phone deterministically: most recently updated wins", async () => {
    const db = await getDb();
    const email = "repeat@example.com";
    await db.collection("masterclass_registrations").insertMany([
      rawRegistration({ email, name: "Older Name", phone: "01711111111", updatedAt: new Date("2026-01-01T00:00:00Z") }),
      rawRegistration({ email, name: "Newer Name", phone: "01722222222", updatedAt: new Date("2026-02-01T00:00:00Z") }),
    ]);

    await runBackfillStudents(db, { apply: true }, NO_OP_LOG);

    const student = await db.collection("masterclass_students").findOne({ emailNormalized: email });
    expect(student?.name).toBe("Newer Name");
    expect(student?.phone).toBe("01722222222");
  });

  it("breaks a tie in updatedAt by most recently created", async () => {
    const db = await getDb();
    const email = "tie@example.com";
    const sameUpdatedAt = new Date("2026-01-01T00:00:00Z");
    await db.collection("masterclass_registrations").insertMany([
      rawRegistration({ email, name: "Created Earlier", updatedAt: sameUpdatedAt, createdAt: new Date("2026-01-01T00:00:00Z") }),
      rawRegistration({ email, name: "Created Later", updatedAt: sameUpdatedAt, createdAt: new Date("2026-01-02T00:00:00Z") }),
    ]);

    await runBackfillStudents(db, { apply: true }, NO_OP_LOG);

    const student = await db.collection("masterclass_students").findOne({ emailNormalized: email });
    expect(student?.name).toBe("Created Later");
  });

  it("creates exactly one Student per emailNormalized and links every matching ENROLLED registration", async () => {
    const db = await getDb();
    const regA1 = rawRegistration({ email: "a@example.com" });
    const regA2 = rawRegistration({ email: "a@example.com" }); // same person, different batch (different registration doc)
    const regB = rawRegistration({ email: "b@example.com" });
    await db.collection("masterclass_registrations").insertMany([regA1, regA2, regB]);

    const summary = await runBackfillStudents(db, { apply: true }, NO_OP_LOG);

    expect(summary.distinctEmails).toBe(2);
    expect(await db.collection("masterclass_students").countDocuments({})).toBe(2);

    const linkedA1 = await db.collection("masterclass_registrations").findOne({ _id: regA1._id });
    const linkedA2 = await db.collection("masterclass_registrations").findOne({ _id: regA2._id });
    expect(linkedA1?.studentId?.toHexString()).toBe(linkedA2?.studentId?.toHexString()); // same student

    const linkedB = await db.collection("masterclass_registrations").findOne({ _id: regB._id });
    expect(linkedB?.studentId).toBeDefined();
    expect(linkedB?.studentId?.toHexString()).not.toBe(linkedA1?.studentId?.toHexString());
  });

  it("links every payment order for a registration via updateMany, regardless of status, never assuming one order per registration", async () => {
    const db = await getDb();
    const registration = rawRegistration({ email: "retry@example.com" });
    await db.collection("masterclass_registrations").insertOne(registration);
    const rejectedOrder = rawOrder(registration._id as ObjectId, { status: "REJECTED" });
    const paidOrder = rawOrder(registration._id as ObjectId, { status: "PAID" });
    await db.collection("payment_orders").insertMany([rejectedOrder, paidOrder]);

    const summary = await runBackfillStudents(db, { apply: true }, NO_OP_LOG);
    expect(summary.ordersLinked).toBe(2);

    const linkedRejected = await db.collection("payment_orders").findOne({ _id: rejectedOrder._id });
    const linkedPaid = await db.collection("payment_orders").findOne({ _id: paidOrder._id });
    expect(linkedRejected?.studentId).toBeDefined();
    expect(linkedPaid?.studentId).toBeDefined();
    expect(linkedRejected?.studentId?.toHexString()).toBe(linkedPaid?.studentId?.toHexString());
  });

  it("is idempotent: a second run makes zero additional writes and creates no second Student", async () => {
    const db = await getDb();
    const registration = rawRegistration({ email: "idempotent@example.com" });
    await db.collection("masterclass_registrations").insertOne(registration);
    await db.collection("payment_orders").insertOne(rawOrder(registration._id as ObjectId));

    const first = await runBackfillStudents(db, { apply: true }, NO_OP_LOG);
    expect(first.registrationsLinked).toBe(1);
    expect(first.ordersLinked).toBe(1);
    expect(await db.collection("masterclass_students").countDocuments({})).toBe(1);

    const before = await snapshotDatabase();
    const second = await runBackfillStudents(db, { apply: true }, NO_OP_LOG);
    const after = await snapshotDatabase();

    expect(second.registrationsLinked).toBe(0);
    expect(second.ordersLinked).toBe(0);
    expect(second.skippedAlreadyLinked).toBe(1);
    expect(after).toEqual(before); // truly nothing changed on the second pass
    expect(await db.collection("masterclass_students").countDocuments({})).toBe(1); // never duplicated
  });

  it("handles a mixed linked/unlinked group safely: only the unlinked registration is touched", async () => {
    const db = await getDb();
    const email = "mixed@example.com";
    const alreadyLinkedStudentId = new ObjectId();
    await db.collection("masterclass_students").insertOne({
      _id: alreadyLinkedStudentId,
      publicStudentId: "STU-234567892C",
      name: "Existing",
      email,
      emailNormalized: email,
      phone: "01700000000",
      phoneE164: "+8801700000000",
      status: "ACTIVE",
      mergedIntoStudentId: null,
      firstEnrolledAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const alreadyLinkedReg = rawRegistration({ email, studentId: alreadyLinkedStudentId });
    const unlinkedReg = rawRegistration({ email });
    await db.collection("masterclass_registrations").insertMany([alreadyLinkedReg, unlinkedReg]);

    const summary = await runBackfillStudents(db, { apply: true }, NO_OP_LOG);

    expect(await db.collection("masterclass_students").countDocuments({})).toBe(1); // reused, not duplicated
    expect(summary.reused).toBe(1);
    expect(summary.created).toBe(0);

    const linkedNow = await db.collection("masterclass_registrations").findOne({ _id: unlinkedReg._id });
    expect(linkedNow?.studentId?.toHexString()).toBe(alreadyLinkedStudentId.toHexString());
  });

  it("prints no name, email, or phone number in apply mode either", async () => {
    const db = await getDb();
    await db.collection("masterclass_registrations").insertOne(
      rawRegistration({ name: "Apply Mode Secret Name", email: "apply-secret@example.com", phone: "01755556666" }),
    );

    const logged: string[] = [];
    await runBackfillStudents(db, { apply: true }, { info: (m) => logged.push(m), warn: (m) => logged.push(m) });

    const combined = logged.join("\n");
    expect(combined).not.toContain("Apply Mode Secret Name");
    expect(combined).not.toContain("apply-secret@example.com");
    expect(combined).not.toContain("01755556666");
  });

  it("never touches a PENDING_PAYMENT or CANCELLED registration", async () => {
    const db = await getDb();
    const pending = rawRegistration({ email: "pending@example.com", status: "PENDING_PAYMENT" });
    const cancelled = rawRegistration({ email: "cancelled@example.com", status: "CANCELLED" });
    await db.collection("masterclass_registrations").insertMany([pending, cancelled]);

    const summary = await runBackfillStudents(db, { apply: true }, NO_OP_LOG);

    expect(summary.distinctEmails).toBe(0);
    expect(await db.collection("masterclass_students").countDocuments({})).toBe(0);
    const stillPending = await db.collection("masterclass_registrations").findOne({ _id: pending._id });
    expect(stillPending?.studentId).toBeUndefined();
  });
});

describe("runBackfillStudents — apply-mode index preparation and failure safety", () => {
  it("dry run never calls createIndex/createCollection, even with matching data present", async () => {
    const db = await getDb();
    await db.collection("masterclass_registrations").insertOne(rawRegistration({ email: "dryrun@example.com" }));

    const log: string[] = [];
    const instrumented = instrumentDb(db, log);
    await runBackfillStudents(instrumented, { apply: false }, NO_OP_LOG);

    expect(log.filter((entry) => entry.endsWith(".createIndex"))).toHaveLength(0);
    const collectionNames = (await db.listCollections().toArray()).map((c) => c.name);
    expect(collectionNames).not.toContain("masterclass_students");
  });

  it("apply mode creates all five required indexes, with the correct uniqueness on each", async () => {
    const db = await getDb();
    await db.collection("masterclass_registrations").insertOne(rawRegistration({ email: "index-check@example.com" }));

    await runBackfillStudents(db, { apply: true }, NO_OP_LOG);

    for (const spec of REQUIRED_MIGRATION_INDEXES) {
      const indexes = await db.collection(spec.collection).indexes();
      const match = indexes.find((idx) => idx.name === spec.name);
      expect(match, `${spec.collection}.${spec.name} should exist`).toBeDefined();
      expect(match?.key).toEqual(spec.key);
      expect(Boolean(match?.unique)).toBe(spec.unique);
    }

    // Explicit per the task's own uniqueness split.
    const studentIndexes = await db.collection("masterclass_students").indexes();
    expect(studentIndexes.find((i) => i.name === "uniq_student_email")?.unique).toBe(true);
    expect(studentIndexes.find((i) => i.name === "uniq_public_student_id")?.unique).toBe(true);
    expect(Boolean(studentIndexes.find((i) => i.name === "phone_lookup")?.unique)).toBe(false);
    const regIndexes = await db.collection("masterclass_registrations").indexes();
    expect(Boolean(regIndexes.find((i) => i.name === "student_id_lookup")?.unique)).toBe(false);
    const orderIndexes = await db.collection("payment_orders").indexes();
    expect(Boolean(orderIndexes.find((i) => i.name === "student_id_lookup")?.unique)).toBe(false);
  });

  it("creates masterclass_students as a side effect of index creation, only in apply mode", async () => {
    const db = await getDb();
    await db.collection("masterclass_registrations").insertOne(rawRegistration({ email: "creates-collection@example.com" }));

    let names = (await db.listCollections().toArray()).map((c) => c.name);
    expect(names).not.toContain("masterclass_students");

    await runBackfillStudents(db, { apply: true }, NO_OP_LOG);

    names = (await db.listCollections().toArray()).map((c) => c.name);
    expect(names).toContain("masterclass_students");
  });

  it("creates every required index before the first Student/registration/order write", async () => {
    const db = await getDb();
    await db.collection("masterclass_registrations").insertOne(rawRegistration({ email: "ordering@example.com" }));

    const log: string[] = [];
    const instrumented = instrumentDb(db, log);
    await runBackfillStudents(instrumented, { apply: true }, NO_OP_LOG);

    const createIndexEntries = log.filter((entry) => entry.endsWith(".createIndex"));
    expect(createIndexEntries).toHaveLength(REQUIRED_MIGRATION_INDEXES.length);

    const lastCreateIndexPosition = log.lastIndexOf(createIndexEntries[createIndexEntries.length - 1]);
    const firstWritePosition = log.findIndex((entry) => !entry.endsWith(".createIndex"));

    expect(firstWritePosition).toBeGreaterThan(-1); // the seeded data does produce a real write
    expect(lastCreateIndexPosition).toBeLessThan(firstWritePosition);
  });

  it("a second apply run treats every index idempotently — no error, same specification", async () => {
    const db = await getDb();
    await db.collection("masterclass_registrations").insertOne(rawRegistration({ email: "rerun@example.com" }));

    await runBackfillStudents(db, { apply: true }, NO_OP_LOG);
    const indexesAfterFirst = await db.collection("masterclass_students").indexes();

    await expect(prepareIndexesForApply(db, NO_OP_LOG)).resolves.toBeUndefined();
    const indexesAfterSecond = await db.collection("masterclass_students").indexes();

    expect(indexesAfterSecond.map((i) => i.name).sort()).toEqual(indexesAfterFirst.map((i) => i.name).sort());
  });

  it("a conflicting same-name index aborts before any Student/registration/order write", async () => {
    const db = await getDb();
    // Same name as the real spec, deliberately wrong key — a genuine
    // specification conflict, not a re-run of the same index.
    await db.collection("masterclass_students").createIndex({ phone: 1 }, { name: "uniq_student_email", unique: false });

    await db.collection("masterclass_registrations").insertOne(rawRegistration({ email: "conflict@example.com" }));

    const before = await snapshotDatabase();
    await expect(runBackfillStudents(db, { apply: true }, NO_OP_LOG)).rejects.toThrow(/uniq_student_email/);
    const after = await snapshotDatabase();

    // Only the pre-existing conflicting index itself differs going in — no
    // document anywhere was created, updated, or linked by the aborted run.
    expect(after.documentsByCollection).toEqual(before.documentsByCollection);
  });

  it("prepareIndexesForApply alone aborts on a conflicting index without touching any collection's documents", async () => {
    const db = await getDb();
    await db.collection("masterclass_students").createIndex({ phone: 1 }, { name: "uniq_student_email", unique: false });

    await expect(prepareIndexesForApply(db, NO_OP_LOG)).rejects.toThrow(/Failed to create\/verify required index/);
    expect(await db.collection("masterclass_students").countDocuments({})).toBe(0);
  });
});
