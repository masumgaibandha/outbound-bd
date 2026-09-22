// Must be the first import — sets MONGODB_URI to an isolated in-memory
// instance before mongoose.ts is imported. No transaction is used, so the
// standalone (non-replica-set) helper is sufficient, same as
// tests/lib/masterclass-backfill-migration.test.ts.
import { mongod } from "../helpers/mongodb-memory-server";

import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { connectToDatabase } from "@/lib/mongoose";
import { runBackfillInquirySource } from "../../scripts/migrations/0002-backfill-inquiry-source";

async function getDb() {
  const connection = await connectToDatabase();
  const db = connection.connection.db;
  if (!db) throw new Error("no db");
  return db;
}

const NO_OP_LOG = { info: () => {}, warn: () => {} };

function rawInquiry(overrides: Record<string, unknown> = {}): { _id: ObjectId } & Record<string, unknown> {
  const now = new Date();
  const doc: { _id: ObjectId } & Record<string, unknown> = {
    _id: new ObjectId(),
    name: "Test Visitor",
    email: "visitor@example.com",
    website: "https://example.com",
    budgetRange: "under-2k",
    privacyConsent: true,
    status: "NEW",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
  return doc;
}

async function clearInquiries() {
  const db = await getDb();
  const existing = await db.listCollections({ name: "inquiries" }).toArray();
  if (existing.length > 0) await db.dropCollection("inquiries");
}

beforeEach(async () => {
  await connectToDatabase();
  await clearInquiries();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("runBackfillInquirySource — dry run is genuinely read-only", () => {
  it("leaves every document byte-identical", async () => {
    const db = await getDb();
    await db.collection("inquiries").insertMany([
      rawInquiry({ email: "a@example.com" }),
      rawInquiry({ email: "b@example.com", source: "agencies-landing" }),
    ]);

    const before = await db.collection("inquiries").find({}).sort({ _id: 1 }).toArray();
    const summary = await runBackfillInquirySource(db, { apply: false }, NO_OP_LOG);
    const after = await db.collection("inquiries").find({}).sort({ _id: 1 }).toArray();

    expect(summary.apply).toBe(false);
    expect(after).toEqual(before);
  });

  it("reports the correct count of documents missing source, ignoring documents that already have one", async () => {
    const db = await getDb();
    await db.collection("inquiries").insertMany([
      rawInquiry({ email: "missing-1@example.com" }),
      rawInquiry({ email: "missing-2@example.com" }),
      rawInquiry({ email: "already-contact@example.com", source: "contact" }),
      rawInquiry({ email: "already-agencies@example.com", source: "agencies-landing" }),
    ]);

    const summary = await runBackfillInquirySource(db, { apply: false }, NO_OP_LOG);
    expect(summary.matched).toBe(2);
    expect(summary.modified).toBeUndefined();
  });

  it("reports zero on an empty collection", async () => {
    const db = await getDb();
    const summary = await runBackfillInquirySource(db, { apply: false }, NO_OP_LOG);
    expect(summary.matched).toBe(0);
  });

  it("logs no name, email, or other visitor-identifying field — only counts", async () => {
    const db = await getDb();
    await db.collection("inquiries").insertOne(
      rawInquiry({ name: "Very Unique Name Xyz", email: "unique-secret@example.com" }),
    );

    const logged: string[] = [];
    await runBackfillInquirySource(db, { apply: false }, { info: (m) => logged.push(m), warn: (m) => logged.push(m) });

    const combined = logged.join("\n");
    expect(combined).not.toContain("Very Unique Name Xyz");
    expect(combined).not.toContain("unique-secret@example.com");
  });
});

describe("runBackfillInquirySource — apply mode (in-memory only, never Production)", () => {
  it("sets source: contact on every document missing it, and leaves documents that already have a source untouched", async () => {
    const db = await getDb();
    await db.collection("inquiries").insertMany([
      rawInquiry({ email: "missing-1@example.com" }),
      rawInquiry({ email: "missing-2@example.com" }),
      rawInquiry({ email: "already-agencies@example.com", source: "agencies-landing" }),
    ]);

    const summary = await runBackfillInquirySource(db, { apply: true }, NO_OP_LOG);
    expect(summary.matched).toBe(2);
    expect(summary.modified).toBe(2);

    const docs = await db.collection("inquiries").find({}).sort({ email: 1 }).toArray();
    const byEmail = new Map(docs.map((d) => [d.email as string, d.source as string]));
    expect(byEmail.get("missing-1@example.com")).toBe("contact");
    expect(byEmail.get("missing-2@example.com")).toBe("contact");
    // Never overwritten — this document's real source is preserved.
    expect(byEmail.get("already-agencies@example.com")).toBe("agencies-landing");
  });

  it("never modifies any field other than source", async () => {
    const db = await getDb();
    const inserted = rawInquiry({ email: "field-check@example.com", name: "Field Check" });
    await db.collection("inquiries").insertOne(inserted);

    await runBackfillInquirySource(db, { apply: true }, NO_OP_LOG);

    const after = await db.collection("inquiries").findOne({ _id: inserted._id });
    expect(after?.name).toBe(inserted.name);
    expect(after?.email).toBe(inserted.email);
    expect(after?.website).toBe(inserted.website);
    expect(after?.createdAt).toEqual(inserted.createdAt);
    expect(after?.source).toBe("contact");
  });

  it("is idempotent: a second run makes zero additional writes", async () => {
    const db = await getDb();
    await db.collection("inquiries").insertOne(rawInquiry({ email: "idempotent@example.com" }));

    const first = await runBackfillInquirySource(db, { apply: true }, NO_OP_LOG);
    expect(first.modified).toBe(1);

    const before = await db.collection("inquiries").find({}).sort({ _id: 1 }).toArray();
    const second = await runBackfillInquirySource(db, { apply: true }, NO_OP_LOG);
    const after = await db.collection("inquiries").find({}).sort({ _id: 1 }).toArray();

    expect(second.matched).toBe(0);
    expect(second.modified).toBe(0);
    expect(after).toEqual(before);
  });

  it("logs no name, email, or other visitor-identifying field in apply mode either", async () => {
    const db = await getDb();
    await db.collection("inquiries").insertOne(
      rawInquiry({ name: "Apply Mode Secret Name", email: "apply-secret@example.com" }),
    );

    const logged: string[] = [];
    await runBackfillInquirySource(db, { apply: true }, { info: (m) => logged.push(m), warn: (m) => logged.push(m) });

    const combined = logged.join("\n");
    expect(combined).not.toContain("Apply Mode Secret Name");
    expect(combined).not.toContain("apply-secret@example.com");
  });

  it("creates no index and no other collection", async () => {
    const db = await getDb();
    await db.collection("inquiries").insertOne(rawInquiry({ email: "no-side-effects@example.com" }));

    const indexesBefore = await db.collection("inquiries").indexes();
    await runBackfillInquirySource(db, { apply: true }, NO_OP_LOG);
    const indexesAfter = await db.collection("inquiries").indexes();

    expect(indexesAfter).toEqual(indexesBefore);
    const collectionNames = (await db.listCollections().toArray()).map((c) => c.name);
    expect(collectionNames).toEqual(["inquiries"]);
  });
});
