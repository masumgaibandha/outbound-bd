// Must be the first import — starts a single-node replica set (transaction
// support) and sets MONGODB_URI before env.ts / mongoose.ts / any
// masterclass module is imported.
import { mongod } from "../helpers/mongodb-memory-replset";

import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Defaults to delegating to the real implementation — only the specific
// collision-retry tests below override it with `mockImplementationOnce`.
const generateRandomRegistrationRefMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/masterclass/refs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/masterclass/refs")>();
  generateRandomRegistrationRefMock.mockImplementation(actual.generateRandomRegistrationRef);
  return { ...actual, generateRandomRegistrationRef: generateRandomRegistrationRefMock };
});

import { connectToDatabase } from "@/lib/mongoose";
import * as constants from "@/lib/masterclass/constants";
import { getMongoClient } from "@/lib/masterclass/db";
import { PublicReferenceGenerationError } from "@/lib/masterclass/errors";
import {
  countOrdersByStatus,
  createDraftOrder,
  findOrderByPublicRef,
  PAYMENT_ORDERS_COLLECTION,
  rejectPayment,
  submitManualPayment,
  verifyPayment,
} from "@/lib/masterclass/payment-orders-repository";
import {
  countEnrolledRegistrations,
  countTotalRegistrations,
  findRegistrationByPublicRef,
  REGISTRATIONS_COLLECTION,
  upsertRegistration,
} from "@/lib/masterclass/registrations-repository";
import { registerForMasterclass } from "@/lib/masterclass/registration-service";
import { COUNTERS_COLLECTION } from "@/lib/masterclass/counters-repository";

function attribution() {
  return { landingPage: "https://outboundbd.com/masterclass/lead-generation-cold-email" };
}

function registrationInput(overrides: Record<string, unknown> = {}) {
  return {
    name: "Rafiq Islam",
    email: "rafiq@example.com",
    phone: "01712345678",
    termsAccepted: true as const,
    marketingConsent: false,
    turnstileToken: "token",
    attribution: attribution(),
    honeypot: "",
    startedAt: Date.now() - 5000,
    ...overrides,
  };
}

async function collections() {
  const connection = await connectToDatabase();
  const db = connection.connection.db;
  if (!db) throw new Error("no db");
  return db;
}

beforeAll(async () => {
  await connectToDatabase();
});

beforeEach(async () => {
  const db = await collections();
  await Promise.all([
    db.collection(REGISTRATIONS_COLLECTION).deleteMany({}),
    db.collection(PAYMENT_ORDERS_COLLECTION).deleteMany({}),
    db.collection(COUNTERS_COLLECTION).deleteMany({}),
  ]);
});

afterEach(() => {
  generateRandomRegistrationRefMock.mockClear();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("registerForMasterclass (transactional write)", () => {
  it("persists both a registration and its draft order together, with a server-resolved price", async () => {
    const result = await registerForMasterclass({
      input: registrationInput(),
      emailNormalized: "rafiq@example.com",
      phoneE164: "+8801712345678",
      idempotencyKey: randomUUID(),
      clientIpAddress: "203.0.113.9",
      clientUserAgent: "vitest",
    });
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;

    const registration = await findRegistrationByPublicRef(result.publicRegistrationRef);
    expect(registration).not.toBeNull();
    expect(registration?.status).toBe("PENDING_PAYMENT");
    expect(registration?.publicRegistrationRef).toMatch(/^MC-\d{4}-[23456789A-HJ-NP-Z]{8}$/);

    const order = await findOrderByPublicRef(result.publicOrderRef);
    expect(order).not.toBeNull();
    expect(order?.amount).toBe(constants.resolvePriceBDT());
    expect(order?.currency).toBe(constants.currency);
    expect(order?.status).toBe("PENDING"); // never auto-PAID
  });

  it("is idempotent: the same Idempotency-Key submitted twice for the same request returns the same order, not a second one", async () => {
    const idempotencyKey = randomUUID();
    const first = await registerForMasterclass({
      input: registrationInput(),
      emailNormalized: "rafiq@example.com",
      phoneE164: "+8801712345678",
      idempotencyKey,
      clientIpAddress: null,
      clientUserAgent: null,
    });
    const second = await registerForMasterclass({
      input: registrationInput(),
      emailNormalized: "rafiq@example.com",
      phoneE164: "+8801712345678",
      idempotencyKey,
      clientIpAddress: null,
      clientUserAgent: null,
    });
    expect(first.kind).toBe("ok");
    expect(second.kind).toBe("ok");
    if (first.kind === "ok" && second.kind === "ok") {
      expect(second.publicOrderRef).toBe(first.publicOrderRef);
    }

    const db = await collections();
    const orderCount = await db.collection(PAYMENT_ORDERS_COLLECTION).countDocuments({});
    expect(orderCount).toBe(1);
    const registrationCount = await db.collection(REGISTRATIONS_COLLECTION).countDocuments({});
    expect(registrationCount).toBe(1);
  });

  it("treats a same-email retry with a matching phone as the same student (updates in place, no duplicate)", async () => {
    await registerForMasterclass({
      input: registrationInput(),
      emailNormalized: "rafiq@example.com",
      phoneE164: "+8801712345678",
      idempotencyKey: randomUUID(),
      clientIpAddress: null,
      clientUserAgent: null,
    });
    const second = await registerForMasterclass({
      input: registrationInput(),
      emailNormalized: "rafiq@example.com",
      phoneE164: "+8801712345678",
      idempotencyKey: randomUUID(),
      clientIpAddress: null,
      clientUserAgent: null,
    });
    expect(second.kind).toBe("ok");

    const db = await collections();
    const registrationCount = await db
      .collection(REGISTRATIONS_COLLECTION)
      .countDocuments({ emailNormalized: "rafiq@example.com" });
    expect(registrationCount).toBe(1);
  });

  it("rejects a same-email registration with a different phone as a conflict, without corrupting the original", async () => {
    await registerForMasterclass({
      input: registrationInput(),
      emailNormalized: "rafiq@example.com",
      phoneE164: "+8801712345678",
      idempotencyKey: randomUUID(),
      clientIpAddress: null,
      clientUserAgent: null,
    });
    const conflict = await registerForMasterclass({
      input: registrationInput({ phone: "01912345678" }),
      emailNormalized: "rafiq@example.com",
      phoneE164: "+8801912345678",
      idempotencyKey: randomUUID(),
      clientIpAddress: null,
      clientUserAgent: null,
    });
    expect(conflict.kind).toBe("registration_conflict");

    const db = await collections();
    const registration = await db
      .collection(REGISTRATIONS_COLLECTION)
      .findOne({ emailNormalized: "rafiq@example.com" });
    expect(registration?.phoneE164).toBe("+8801712345678"); // unchanged
  });

  it("a repeated registration with a DIFFERENT Idempotency-Key never opens a second active payment order (the duplicate-order bug)", async () => {
    const email = `repeat-${randomUUID()}@example.com`;
    const first = await registerForMasterclass({
      input: registrationInput({ email }),
      emailNormalized: email,
      phoneE164: "+8801712345678",
      idempotencyKey: randomUUID(),
      clientIpAddress: null,
      clientUserAgent: null,
    });
    const second = await registerForMasterclass({
      input: registrationInput({ email }),
      emailNormalized: email,
      phoneE164: "+8801712345678",
      idempotencyKey: randomUUID(), // deliberately a different key — this is the bug scenario
      clientIpAddress: null,
      clientUserAgent: null,
    });
    expect(first.kind).toBe("ok");
    expect(second.kind).toBe("ok");
    if (first.kind === "ok" && second.kind === "ok") {
      expect(second.publicOrderRef).toBe(first.publicOrderRef); // reused, not a second order
    }

    const db = await collections();
    const orderCount = await db.collection(PAYMENT_ORDERS_COLLECTION).countDocuments({});
    expect(orderCount).toBe(1);
  });

  it("genuinely concurrent registration attempts for the same brand-new student never create more than one active order", async () => {
    const email = `concurrent-${randomUUID()}@example.com`;
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        registerForMasterclass({
          input: registrationInput({ email }),
          emailNormalized: email,
          phoneE164: "+8801712345678",
          idempotencyKey: randomUUID(),
          clientIpAddress: null,
          clientUserAgent: null,
        }),
      ),
    );

    expect(results.every((r) => r.kind === "ok")).toBe(true);
    const publicOrderRefs = new Set(results.map((r) => (r.kind === "ok" ? r.publicOrderRef : r.kind)));
    expect(publicOrderRefs.size).toBe(1); // every concurrent caller converged on the same single order

    const db = await collections();
    const orderCount = await db.collection(PAYMENT_ORDERS_COLLECTION).countDocuments({});
    expect(orderCount).toBe(1);
    const registrationCount = await db
      .collection(REGISTRATIONS_COLLECTION)
      .countDocuments({ emailNormalized: email });
    expect(registrationCount).toBe(1);
  }, 30_000);
});

describe("createDraftOrder", () => {
  function draftInput(registrationId: mongoose.Types.ObjectId, overrides: Record<string, unknown> = {}) {
    return {
      registrationId,
      masterclassSlug: constants.masterclassSlug,
      batchId: constants.batchId,
      amount: constants.resolvePriceBDT(),
      currency: constants.currency,
      idempotencyKey: randomUUID(),
      attribution: { capturedAt: new Date() },
      clientIpAddress: null,
      clientUserAgent: null,
      ...overrides,
    };
  }

  it("is idempotent per (batchId, idempotencyKey): same registration, same idempotency key", async () => {
    const registrationId = new mongoose.Types.ObjectId();
    const idempotencyKey = randomUUID();
    const input = draftInput(registrationId, { idempotencyKey });
    const first = await createDraftOrder(input);
    const second = await createDraftOrder(input);
    expect(first.wasExisting).toBe(false);
    expect(first.reason).toBe("created");
    expect(second.wasExisting).toBe(true);
    expect(second.reason).toBe("idempotent_replay");
    expect(second.order.publicOrderRef).toBe(first.order.publicOrderRef);

    const db = await collections();
    expect(await db.collection(PAYMENT_ORDERS_COLLECTION).countDocuments({ registrationId })).toBe(1);
  });

  it("same registration, a DIFFERENT idempotency key: reuses the existing PENDING order instead of creating a second one", async () => {
    const registrationId = new mongoose.Types.ObjectId();
    const first = await createDraftOrder(draftInput(registrationId));
    const second = await createDraftOrder(draftInput(registrationId));
    expect(second.wasExisting).toBe(true);
    expect(second.reason).toBe("active_order_reuse");
    expect(second.order.publicOrderRef).toBe(first.order.publicOrderRef);
    expect(second.order.status).toBe("PENDING");

    const db = await collections();
    expect(await db.collection(PAYMENT_ORDERS_COLLECTION).countDocuments({ registrationId })).toBe(1);
  });

  it("existing REVIEW order: a fresh idempotency key reuses it rather than opening a second order", async () => {
    const registrationId = new mongoose.Types.ObjectId();
    const { order } = await createDraftOrder(draftInput(registrationId));
    await submitManualPayment({
      publicOrderRef: order.publicOrderRef,
      method: "BKASH",
      senderNumber: "+8801712345678",
      transactionIdRaw: `TXN-${randomUUID()}`,
    });

    const retry = await createDraftOrder(draftInput(registrationId));
    expect(retry.reason).toBe("active_order_reuse");
    expect(retry.order.publicOrderRef).toBe(order.publicOrderRef);
    expect(retry.order.status).toBe("REVIEW");

    const db = await collections();
    expect(await db.collection(PAYMENT_ORDERS_COLLECTION).countDocuments({ registrationId })).toBe(1);
  });

  it("existing PAID order: a fresh idempotency key reuses the paid order rather than opening a new active one — no second seat", async () => {
    const registrationId = new mongoose.Types.ObjectId();
    const { order } = await createDraftOrder(draftInput(registrationId));
    await submitManualPayment({
      publicOrderRef: order.publicOrderRef,
      method: "BKASH",
      senderNumber: "+8801712345678",
      transactionIdRaw: `TXN-${randomUUID()}`,
    });
    await verifyPayment({ publicOrderRef: order.publicOrderRef, verifiedBy: "admin" });

    const retry = await createDraftOrder(draftInput(registrationId));
    expect(retry.reason).toBe("active_order_reuse");
    expect(retry.order.publicOrderRef).toBe(order.publicOrderRef);
    expect(retry.order.status).toBe("PAID");

    const db = await collections();
    expect(await db.collection(PAYMENT_ORDERS_COLLECTION).countDocuments({ registrationId })).toBe(1);
  });

  it("retry after REJECTED: a fresh idempotency key is allowed to open a genuinely new order", async () => {
    const registrationId = new mongoose.Types.ObjectId();
    const { order } = await createDraftOrder(draftInput(registrationId));
    await submitManualPayment({
      publicOrderRef: order.publicOrderRef,
      method: "BKASH",
      senderNumber: "+8801712345678",
      transactionIdRaw: `TXN-${randomUUID()}`,
    });
    await rejectPayment({ publicOrderRef: order.publicOrderRef, verifiedBy: "admin", reason: "not verifiable" });

    const retry = await createDraftOrder(draftInput(registrationId));
    expect(retry.reason).toBe("created");
    expect(retry.order.publicOrderRef).not.toBe(order.publicOrderRef);
    expect(retry.order.status).toBe("PENDING");

    const db = await collections();
    // Two documents total (the REJECTED one plus the new PENDING one), but only one holds the active-order lock.
    expect(await db.collection(PAYMENT_ORDERS_COLLECTION).countDocuments({ registrationId })).toBe(2);
    expect(
      await db.collection(PAYMENT_ORDERS_COLLECTION).countDocuments({ registrationId, activeOrderLock: true }),
    ).toBe(1);
  });

  it("retry after FAILED/CANCELLED: unreachable via any current code path (only REJECTED is ever set), so this simulates the future-gateway invariant directly — an order with the lock cleared never blocks a new one", async () => {
    const registrationId = new mongoose.Types.ObjectId();
    const { order } = await createDraftOrder(draftInput(registrationId));

    // No repository function sets FAILED/CANCELLED today (see the reserved-for-future-gateway
    // doc comment on PaymentOrderStatus) — write it directly to prove the *documented contract*
    // (clear `activeOrderLock` on any terminal-negative transition) actually unblocks a retry.
    const db = await collections();
    await db
      .collection(PAYMENT_ORDERS_COLLECTION)
      .updateOne({ publicOrderRef: order.publicOrderRef }, { $set: { status: "CANCELLED" }, $unset: { activeOrderLock: "" } });

    const retry = await createDraftOrder(draftInput(registrationId));
    expect(retry.reason).toBe("created");
    expect(retry.order.publicOrderRef).not.toBe(order.publicOrderRef);
  });

  it("concurrent createDraftOrder calls (different idempotency keys, same registration) never persist more than one active order", async () => {
    const registrationId = new mongoose.Types.ObjectId();
    const results = await Promise.all(
      Array.from({ length: 8 }, () => createDraftOrder(draftInput(registrationId))),
    );
    const refs = new Set(results.map((r) => r.order.publicOrderRef));
    expect(refs.size).toBe(1); // every caller converged on the same single order

    const db = await collections();
    expect(await db.collection(PAYMENT_ORDERS_COLLECTION).countDocuments({ registrationId })).toBe(1);
  }, 30_000);

  it("registerForMasterclass: two concurrent calls for the same registration (different idempotency keys) converge on one active order, fast — never an unhandled NoSuchTransaction and never a multi-second hang", async () => {
    // createDraftOrder()'s duplicate-key catch block re-reads on the SAME
    // session immediately after a duplicate-key write error — the exact
    // pattern the diagnostic proved throws NoSuchTransaction, not the
    // winning document (see upsertRegistration's identical, already-fixed
    // hazard). A direct two-transaction reproduction of the precise
    // "snapshot missed a just-committed competitor" race is not reliable in
    // this single-node local replica set: an open transaction that has only
    // read blocks an external write to the same collection here, which may
    // be a mongodb-memory-server single-node concurrency artifact rather
    // than real multi-node Atlas behavior, and isn't representative enough
    // to assert on. This test instead exercises the actual, realistic
    // trigger end-to-end: two genuinely concurrent registerForMasterclass()
    // calls, each running its own real session.withTransaction(). If
    // createDraftOrder's re-read ever fires here, the resulting
    // NoSuchTransaction is invisible to registerForMasterclass()'s own
    // isDuplicateKeyError() check (code 251, not 11000) and can only be
    // recovered by MongoDB's own opaque, unbounded withTransaction() retry —
    // which the original diagnostic proved can spin hundreds of times over
    // a long wall-clock budget for a *persistent* conflict. For this
    // one-shot race it should self-resolve in a single extra internal
    // retry, so this asserts both a clean result and a fast one.
    const email = `race-${randomUUID()}@example.com`;
    const started = Date.now();
    const [a, b] = await Promise.all([
      registerForMasterclass({
        input: registrationInput({ email }),
        emailNormalized: email,
        phoneE164: "+8801799999999",
        idempotencyKey: randomUUID(),
        clientIpAddress: null,
        clientUserAgent: null,
      }),
      registerForMasterclass({
        input: registrationInput({ email }),
        emailNormalized: email,
        phoneE164: "+8801799999999",
        idempotencyKey: randomUUID(),
        clientIpAddress: null,
        clientUserAgent: null,
      }),
    ]);
    const elapsedMs = Date.now() - started;

    expect(a.kind).toBe("ok");
    expect(b.kind).toBe("ok");
    if (a.kind !== "ok" || b.kind !== "ok") throw new Error("unreachable");

    expect(a.publicOrderRef).toBe(b.publicOrderRef);
    expect(elapsedMs).toBeLessThan(10_000);

    const db = await collections();
    expect(await db.collection(PAYMENT_ORDERS_COLLECTION).countDocuments({ publicOrderRef: a.publicOrderRef })).toBe(
      1,
    );
    expect(await db.collection(PAYMENT_ORDERS_COLLECTION).countDocuments({ activeOrderLock: true })).toBe(1);
  }, 20_000);

  it("enforces the rule with a partial unique index, not just an application-level check", async () => {
    const db = await collections();
    const indexes = await db.collection(PAYMENT_ORDERS_COLLECTION).indexes();
    const activeOrderIndex = indexes.find((i) => i.name === "uniq_active_or_paid_order_per_registration");
    expect(activeOrderIndex).toBeDefined();
    expect(activeOrderIndex?.unique).toBe(true);
    expect(activeOrderIndex?.key).toEqual({ registrationId: 1 });
    expect(activeOrderIndex?.partialFilterExpression).toEqual({ activeOrderLock: { $exists: true } });
  });
});

describe("manual payment submission and verification", () => {
  async function createRegistrationAndOrder() {
    const result = await registerForMasterclass({
      input: registrationInput({ email: `student-${randomUUID()}@example.com` }),
      emailNormalized: `student-${randomUUID()}@example.com`,
      phoneE164: "+8801712345678",
      idempotencyKey: randomUUID(),
      clientIpAddress: null,
      clientUserAgent: null,
    });
    if (result.kind !== "ok") throw new Error("setup failed");
    return result;
  }

  it("only ever moves an order to REVIEW, never PAID, on submission", async () => {
    const { publicOrderRef } = await createRegistrationAndOrder();
    const updated = await submitManualPayment({
      publicOrderRef,
      method: "BKASH",
      senderNumber: "+8801712345678",
      transactionIdRaw: "TXN123456",
    });
    expect(updated.status).toBe("REVIEW");
  });

  it("rejects a transaction ID already recorded against a different order", async () => {
    const orderA = await createRegistrationAndOrder();
    const orderB = await createRegistrationAndOrder();

    await submitManualPayment({
      publicOrderRef: orderA.publicOrderRef,
      method: "BKASH",
      senderNumber: "+8801712345678",
      transactionIdRaw: "DUPLICATE-TXN",
    });

    await expect(
      submitManualPayment({
        publicOrderRef: orderB.publicOrderRef,
        method: "NAGAD",
        senderNumber: "+8801712345678",
        transactionIdRaw: "duplicate-txn", // normalized to the same uppercase value
      }),
    ).rejects.toThrow();
  });

  it("BANK: persists payerName/senderBankName with senderNumber null, and moves the order to REVIEW, never PAID", async () => {
    const { publicOrderRef } = await createRegistrationAndOrder();
    const updated = await submitManualPayment({
      publicOrderRef,
      method: "BANK",
      payerName: "Rafiq Islam",
      senderBankName: "City Bank",
      transactionIdRaw: "REF-BANK-001",
    });
    expect(updated.status).toBe("REVIEW");
    expect(updated.method).toBe("BANK");
    expect(updated.manualPayment?.senderNumber).toBeNull();
    expect(updated.manualPayment?.payerName).toBe("Rafiq Islam");
    expect(updated.manualPayment?.senderBankName).toBe("City Bank");
  });

  it("BANK: senderBankName defaults to null when not provided", async () => {
    const { publicOrderRef } = await createRegistrationAndOrder();
    const updated = await submitManualPayment({
      publicOrderRef,
      method: "BANK",
      payerName: "Rafiq Islam",
      transactionIdRaw: "REF-BANK-002",
    });
    expect(updated.manualPayment?.senderBankName).toBeNull();
  });

  it("rejects a transaction ID already recorded against a different order, across different manual methods (bKash vs bank)", async () => {
    const orderA = await createRegistrationAndOrder();
    const orderB = await createRegistrationAndOrder();

    await submitManualPayment({
      publicOrderRef: orderA.publicOrderRef,
      method: "BKASH",
      senderNumber: "+8801712345678",
      transactionIdRaw: "SHARED-TXN-ID",
    });

    await expect(
      submitManualPayment({
        publicOrderRef: orderB.publicOrderRef,
        method: "BANK",
        payerName: "Someone Else",
        transactionIdRaw: "shared-txn-id", // normalized to the same uppercase value
      }),
    ).rejects.toThrow();
  });

  it("verifyPayment only transitions an order that is currently in REVIEW — a second call is a no-op (idempotent approval)", async () => {
    const { publicOrderRef } = await createRegistrationAndOrder();
    await submitManualPayment({
      publicOrderRef,
      method: "BKASH",
      senderNumber: "+8801712345678",
      transactionIdRaw: "TXN999",
    });

    const firstApproval = await verifyPayment({ publicOrderRef, verifiedBy: "admin" });
    expect(firstApproval?.status).toBe("PAID");

    const secondApproval = await verifyPayment({ publicOrderRef, verifiedBy: "admin" });
    expect(secondApproval).toBeNull(); // status is no longer REVIEW, so the guarded update matches nothing
  });
});

/**
 * These tests exercise the REAL transactional path
 * (`registerForMasterclass()`, a real single-node replica set — not a raw
 * `upsertRegistration()` call with no session, which would run outside any
 * transaction and prove nothing about transaction-abort behavior). Confirmed
 * empirically before writing this fix: MongoDB aborts an entire
 * multi-document transaction on any write error, including an ordinary
 * duplicate-key error — every later operation on that same session then
 * fails with `NoSuchTransaction`. An earlier, incorrect version of this
 * retry re-read on the same (already-aborted) session inside one
 * transaction; that read's `NoSuchTransaction` error escaped uncaught
 * (`isDuplicateKeyError()` doesn't recognize code 251), and a test that
 * called `upsertRegistration()` directly without a session never caught
 * this because a session-less call never uses a transaction at all.
 */
describe("registerForMasterclass — random public reference collision handling (real transactions)", () => {
  it("retries with a fresh transaction (fresh session) when the randomly generated reference collides, and the retry succeeds with both a registration and its draft order", async () => {
    // Seed an existing, unrelated registration holding the ref the mock will hand out first.
    const seededEmail = `existing-${randomUUID()}@example.com`;
    const seeded = await registerForMasterclass({
      input: registrationInput({ email: seededEmail }),
      emailNormalized: seededEmail,
      phoneE164: "+8801700000000",
      idempotencyKey: randomUUID(),
      clientIpAddress: null,
      clientUserAgent: null,
    });
    if (seeded.kind !== "ok") throw new Error("setup failed");
    generateRandomRegistrationRefMock.mockClear(); // discard the setup call's own invocation

    generateRandomRegistrationRefMock
      .mockImplementationOnce(() => seeded.publicRegistrationRef) // collides — this whole transaction aborts and is retried fresh
      .mockImplementationOnce(() => "MC-2026-FRESHUNIQ"); // fresh transaction, fresh ref — succeeds

    const newEmail = `new-${randomUUID()}@example.com`;
    const result = await registerForMasterclass({
      input: registrationInput({ email: newEmail }),
      emailNormalized: newEmail,
      phoneE164: "+8801712345678",
      idempotencyKey: randomUUID(),
      clientIpAddress: null,
      clientUserAgent: null,
    });

    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.publicRegistrationRef).toBe("MC-2026-FRESHUNIQ");
    expect(generateRandomRegistrationRefMock).toHaveBeenCalledTimes(2);

    // The retry actually persisted BOTH halves (registration + its draft
    // order) via a genuinely fresh, successful transaction — not a partial
    // write left over from the aborted first attempt.
    const registration = await findRegistrationByPublicRef("MC-2026-FRESHUNIQ");
    expect(registration).not.toBeNull();
    expect(registration?.emailNormalized).toBe(newEmail);
    const order = await findOrderByPublicRef(result.publicOrderRef);
    expect(order).not.toBeNull();
    expect(order?.status).toBe("PENDING");

    // The pre-existing colliding document, and the aborted attempt, left no trace on it.
    const existing = await findRegistrationByPublicRef(seeded.publicRegistrationRef);
    expect(existing?.emailNormalized).toBe(seededEmail);

    // No orphaned registration exists for newEmail beyond the one successful one.
    const db = await collections();
    const count = await db
      .collection(REGISTRATIONS_COLLECTION)
      .countDocuments({ emailNormalized: newEmail });
    expect(count).toBe(1);
  });

  it("throws a controlled PublicReferenceGenerationError after exhausting exactly 5 fresh-transaction attempts, leaving no partial document behind", async () => {
    const seededEmail = `always-${randomUUID()}@example.com`;
    const seeded = await registerForMasterclass({
      input: registrationInput({ email: seededEmail }),
      emailNormalized: seededEmail,
      phoneE164: "+8801700000000",
      idempotencyKey: randomUUID(),
      clientIpAddress: null,
      clientUserAgent: null,
    });
    if (seeded.kind !== "ok") throw new Error("setup failed");
    generateRandomRegistrationRefMock.mockClear(); // discard the setup call's own invocation

    // Every attempt returns the same colliding ref — every fresh transaction
    // fails identically. Exactly 5 queued `Once` implementations, so the mock
    // automatically reverts to its real default afterward — never
    // permanently overridden, which would otherwise break every later test
    // in this file that registers a new student.
    for (let i = 0; i < 5; i++) {
      generateRandomRegistrationRefMock.mockImplementationOnce(() => seeded.publicRegistrationRef);
    }

    const newEmail = `never-${randomUUID()}@example.com`;
    await expect(
      registerForMasterclass({
        input: registrationInput({ email: newEmail }),
        emailNormalized: newEmail,
        phoneE164: "+8801712345678",
        idempotencyKey: randomUUID(),
        clientIpAddress: null,
        clientUserAgent: null,
      }),
    ).rejects.toThrow(PublicReferenceGenerationError);

    // Bounded — exactly 5 fresh-transaction attempts, never unbounded and
    // never relying on the MongoDB driver's own internal transient-error retry.
    expect(generateRandomRegistrationRefMock).toHaveBeenCalledTimes(5);

    // No stray registration, and no stray payment order, survives any of the
    // 5 aborted transactions.
    const db = await collections();
    const registrationCount = await db
      .collection(REGISTRATIONS_COLLECTION)
      .countDocuments({ emailNormalized: newEmail });
    expect(registrationCount).toBe(0);
    const orderCount = await db
      .collection(PAYMENT_ORDERS_COLLECTION)
      .countDocuments({});
    // Only the one order from the seeded setup call above exists — none from any failed attempt.
    expect(orderCount).toBe(1);
  });

  it("upsertRegistration itself never internally retries on a reference collision — a direct call with a real transaction throws PublicReferenceCollisionError on the very first colliding attempt", async () => {
    const seededEmail = `direct-${randomUUID()}@example.com`;
    const seeded = await registerForMasterclass({
      input: registrationInput({ email: seededEmail }),
      emailNormalized: seededEmail,
      phoneE164: "+8801700000000",
      idempotencyKey: randomUUID(),
      clientIpAddress: null,
      clientUserAgent: null,
    });
    if (seeded.kind !== "ok") throw new Error("setup failed");
    generateRandomRegistrationRefMock.mockClear(); // discard the setup call's own invocation

    generateRandomRegistrationRefMock.mockImplementationOnce(() => seeded.publicRegistrationRef);

    const client = await getMongoClient();
    const session = client.startSession();
    try {
      await expect(
        session.withTransaction(() =>
          upsertRegistration(
            {
              masterclassSlug: constants.masterclassSlug,
              batchId: constants.batchId,
              name: "Direct Caller",
              email: `direct-new-${randomUUID()}@example.com`,
              emailNormalized: `direct-new-${randomUUID()}@example.com`,
              phone: "01712345678",
              phoneE164: "+8801712345678",
              marketingConsent: false,
              attribution: { capturedAt: new Date() },
            },
            session,
          ),
        ),
      ).rejects.toThrow();
    } finally {
      await session.endSession();
    }
    // Exactly one attempt — upsertRegistration itself never loops.
    expect(generateRandomRegistrationRefMock).toHaveBeenCalledTimes(1);
  });
});

describe("legacy sequential-reference compatibility", () => {
  it("findRegistrationByPublicRef retrieves a document with a legacy zero-padded sequential ref exactly as it would a new random one", async () => {
    const db = await collections();
    await db.collection(REGISTRATIONS_COLLECTION).insertOne({
      publicRegistrationRef: "MC-2026-000123",
      masterclassSlug: constants.masterclassSlug,
      batchId: constants.batchId,
      name: "Legacy Student",
      email: "legacy@example.com",
      emailNormalized: "legacy@example.com",
      phone: "01700000000",
      phoneE164: "+8801700000000",
      status: "ENROLLED",
      consent: {
        accepted: true,
        privacyPolicyVersion: "test",
        termsVersion: "test",
        refundPolicyVersion: "test",
        acceptedAt: new Date(),
        marketingConsent: false,
      },
      firstTouchAttribution: { capturedAt: new Date() },
      lastTouchAttribution: { capturedAt: new Date() },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const found = await findRegistrationByPublicRef("MC-2026-000123");
    expect(found).not.toBeNull();
    expect(found?.email).toBe("legacy@example.com");
    expect(found?.status).toBe("ENROLLED");
  });
});

describe("admin summary counts", () => {
  it("countTotalRegistrations reflects every registration regardless of its reference format", async () => {
    const db = await collections();
    await db.collection(REGISTRATIONS_COLLECTION).insertMany([
      {
        publicRegistrationRef: "MC-2026-000001",
        masterclassSlug: constants.masterclassSlug,
        batchId: constants.batchId,
        name: "A",
        email: "a@example.com",
        emailNormalized: "a@example.com",
        phone: "01700000001",
        phoneE164: "+8801700000001",
        status: "PENDING_PAYMENT",
        consent: {
          accepted: true,
          privacyPolicyVersion: "test",
          termsVersion: "test",
          refundPolicyVersion: "test",
          acceptedAt: new Date(),
          marketingConsent: false,
        },
        firstTouchAttribution: { capturedAt: new Date() },
        lastTouchAttribution: { capturedAt: new Date() },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        publicRegistrationRef: "MC-2026-K7M4Q9P2",
        masterclassSlug: constants.masterclassSlug,
        batchId: constants.batchId,
        name: "B",
        email: "b@example.com",
        emailNormalized: "b@example.com",
        phone: "01700000002",
        phoneE164: "+8801700000002",
        status: "ENROLLED",
        consent: {
          accepted: true,
          privacyPolicyVersion: "test",
          termsVersion: "test",
          refundPolicyVersion: "test",
          acceptedAt: new Date(),
          marketingConsent: false,
        },
        firstTouchAttribution: { capturedAt: new Date() },
        lastTouchAttribution: { capturedAt: new Date() },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    expect(await countTotalRegistrations()).toBe(2);
    // Only the ENROLLED one counts — never a raw count of all generated IDs.
    expect(await countEnrolledRegistrations()).toBe(1);
  });

  it("countEnrolledRegistrations excludes PENDING_PAYMENT and CANCELLED registrations", async () => {
    const db = await collections();
    await db.collection(REGISTRATIONS_COLLECTION).insertMany([
      { status: "PENDING_PAYMENT" },
      { status: "CANCELLED" },
      { status: "ENROLLED" },
      { status: "ENROLLED" },
    ].map((partial, i) => ({
      publicRegistrationRef: `MC-2026-STATUS0${i}`,
      masterclassSlug: constants.masterclassSlug,
      batchId: constants.batchId,
      name: `Student ${i}`,
      email: `student${i}@example.com`,
      emailNormalized: `student${i}@example.com`,
      phone: "01700000000",
      phoneE164: "+8801700000000",
      consent: {
        accepted: true,
        privacyPolicyVersion: "test",
        termsVersion: "test",
        refundPolicyVersion: "test",
        acceptedAt: new Date(),
        marketingConsent: false,
      },
      firstTouchAttribution: { capturedAt: new Date() },
      lastTouchAttribution: { capturedAt: new Date() },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...partial,
    })));

    expect(await countTotalRegistrations()).toBe(4);
    expect(await countEnrolledRegistrations()).toBe(2);
  });

  it("countOrdersByStatus counts REVIEW and REJECTED independently and accurately", async () => {
    async function registerAndOrder() {
      const email = `count-${randomUUID()}@example.com`;
      const result = await registerForMasterclass({
        input: {
          name: "Rafiq Islam",
          email,
          phone: "01712345678",
          termsAccepted: true as const,
          marketingConsent: false,
          turnstileToken: "token",
          attribution: {},
          honeypot: "",
          startedAt: Date.now() - 5000,
        },
        emailNormalized: email,
        phoneE164: "+8801712345678",
        idempotencyKey: randomUUID(),
        clientIpAddress: null,
        clientUserAgent: null,
      });
      if (result.kind !== "ok") throw new Error("setup failed");
      return result;
    }

    const reviewOrder = await registerAndOrder();
    await submitManualPayment({
      publicOrderRef: reviewOrder.publicOrderRef,
      method: "BKASH",
      senderNumber: "+8801712345678",
      transactionIdRaw: `TXN-${randomUUID()}`,
    });

    const rejectedOrder = await registerAndOrder();
    await submitManualPayment({
      publicOrderRef: rejectedOrder.publicOrderRef,
      method: "BKASH",
      senderNumber: "+8801712345678",
      transactionIdRaw: `TXN-${randomUUID()}`,
    });
    await rejectPayment({ publicOrderRef: rejectedOrder.publicOrderRef, verifiedBy: "admin", reason: null });

    expect(await countOrdersByStatus("REVIEW")).toBe(1);
    expect(await countOrdersByStatus("REJECTED")).toBe(1);
    expect(await countOrdersByStatus("PAID")).toBe(0);
  });
});
