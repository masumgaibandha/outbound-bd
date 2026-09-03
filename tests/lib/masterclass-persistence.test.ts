// Must be the first import — starts a single-node replica set (transaction
// support) and sets MONGODB_URI before env.ts / mongoose.ts / any
// masterclass module is imported.
import { mongod } from "../helpers/mongodb-memory-replset";

import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { connectToDatabase } from "@/lib/mongoose";
import * as constants from "@/lib/masterclass/constants";
import {
  createDraftOrder,
  findOrderByPublicRef,
  PAYMENT_ORDERS_COLLECTION,
  rejectPayment,
  submitManualPayment,
  verifyPayment,
} from "@/lib/masterclass/payment-orders-repository";
import {
  findRegistrationByPublicRef,
  REGISTRATIONS_COLLECTION,
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
    expect(registration?.publicRegistrationRef).toMatch(/^MC-\d{4}-\d{6}$/);

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
