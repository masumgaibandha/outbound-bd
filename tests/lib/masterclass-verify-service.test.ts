// Must be the first import — starts a single-node replica set (transaction
// support) and sets MONGODB_URI before env.ts / mongoose.ts / any
// masterclass module is imported. Required now that approvePayment() uses
// a real multi-document transaction (it previously did not, so this file
// used to import the non-transactional mongodb-memory-server helper).
import { mongod } from "../helpers/mongodb-memory-replset";

import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.hoisted(() => vi.fn());
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

const generateRandomStudentIdMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/masterclass/student-refs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/masterclass/student-refs")>();
  generateRandomStudentIdMock.mockImplementation(actual.generateRandomStudentId);
  return { ...actual, generateRandomStudentId: generateRandomStudentIdMock };
});

import { connectToDatabase } from "@/lib/mongoose";
import * as constants from "@/lib/masterclass/constants";
import { ApprovalConsistencyError, StudentLinkGenerationError } from "@/lib/masterclass/errors";
import {
  createDraftOrder,
  findOrderByPublicRef,
  PAYMENT_ORDERS_COLLECTION,
  submitManualPayment,
} from "@/lib/masterclass/payment-orders-repository";
import {
  findRegistrationByPublicRef,
  REGISTRATIONS_COLLECTION,
  upsertRegistration,
} from "@/lib/masterclass/registrations-repository";
import { COUNTERS_COLLECTION } from "@/lib/masterclass/counters-repository";
import { PUBLIC_STUDENT_ID_PATTERN } from "@/lib/masterclass/student-refs";
import { countStudents, STUDENTS_COLLECTION } from "@/lib/masterclass/students-repository";
import { approvePayment, rejectPaymentOrder, retryDelivery } from "@/lib/masterclass/verify-service";

const EVENT_SOURCE_URL = "https://outboundbd.com/masterclass/lead-generation-cold-email";

async function seedOrderInReview(overrides: { email?: string; batchId?: string } = {}) {
  const email = overrides.email ?? `student-${randomUUID()}@example.com`;
  const batchId = overrides.batchId ?? constants.batchId;
  const registration = await upsertRegistration({
    masterclassSlug: constants.masterclassSlug,
    batchId,
    name: "Test Student",
    email,
    emailNormalized: email,
    phone: "01712345678",
    phoneE164: "+8801712345678",
    marketingConsent: false,
    attribution: { capturedAt: new Date() },
  });
  const { order } = await createDraftOrder({
    registrationId: registration._id!,
    masterclassSlug: constants.masterclassSlug,
    batchId,
    amount: constants.resolvePriceBDT(),
    currency: constants.currency,
    idempotencyKey: randomUUID(),
    attribution: { capturedAt: new Date() },
    clientIpAddress: null,
    clientUserAgent: null,
  });
  await submitManualPayment({
    publicOrderRef: order.publicOrderRef,
    method: "BKASH",
    senderNumber: "+8801712345678",
    transactionIdRaw: `TXN-${randomUUID()}`,
  });
  return { publicOrderRef: order.publicOrderRef, registrationRef: registration.publicRegistrationRef, email };
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
    db.collection(STUDENTS_COLLECTION).deleteMany({}),
  ]);
  sendMock.mockReset();
  sendMock.mockResolvedValue({ data: { id: "email_1" }, error: null });
  generateRandomStudentIdMock.mockClear();
  vi.unstubAllEnvs();
  vi.stubEnv("RESEND_API_KEY", "test-resend-key");
  vi.stubEnv("RESEND_FROM_EMAIL", "Outbound BD <hello@outboundbd.com>");
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("approvePayment", () => {
  it("returns not_found for a ref that doesn't exist", async () => {
    const result = await approvePayment("ord_does-not-exist", "admin", EVENT_SOURCE_URL);
    expect(result.kind).toBe("not_found");
  });

  it("moves REVIEW -> PAID, enrolls the registration, creates a Student, links both, and sends a confirmation email (Resend mocked)", async () => {
    const { publicOrderRef, registrationRef } = await seedOrderInReview();

    const result = await approvePayment(publicOrderRef, "admin", EVENT_SOURCE_URL);
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.order.status).toBe("PAID");
      expect(result.order.verifiedBy).toBe("admin");
      expect(result.order.studentId).toBeInstanceOf(ObjectId);
    }

    const registration = await findRegistrationByPublicRef(registrationRef);
    expect(registration?.status).toBe("ENROLLED");
    expect(registration?.studentId).toBeInstanceOf(ObjectId);

    expect(await countStudents()).toBe(1);

    expect(sendMock).toHaveBeenCalledTimes(1);
    const [, options] = sendMock.mock.calls[0];
    expect(options).toEqual({ idempotencyKey: `masterclass-confirmation-${registrationRef}` });

    const order = await findOrderByPublicRef(publicOrderRef);
    expect(order?.confirmationEmail.status).toBe("SENT");
    // Meta CAPI isn't configured in this test env, so it must fail soft, not throw.
    expect(order?.purchaseCapi.status).toBe("FAILED");
    expect(order?.purchaseCapi.lastErrorCode).toBe("CAPI_NOT_CONFIGURED");
  });

  it("the created Student's publicStudentId matches the STU- + 10 char shape", async () => {
    const { publicOrderRef } = await seedOrderInReview();
    const result = await approvePayment(publicOrderRef, "admin", EVENT_SOURCE_URL);
    if (result.kind !== "ok") throw new Error("setup failed");

    const db = await collections();
    const student = await db.collection(STUDENTS_COLLECTION).findOne({ _id: result.order.studentId! });
    expect(student?.publicStudentId).toMatch(PUBLIC_STUDENT_ID_PATTERN);
  });

  it("reuses the same Student for a second approved enrollment under the same email in a different batch, updating name/phone but never publicStudentId/emailNormalized/firstEnrolledAt", async () => {
    const email = `repeat-${randomUUID()}@example.com`;
    const batchIdA = `${constants.batchId}-batch-a`;
    const batchIdB = `${constants.batchId}-batch-b`;

    const first = await seedOrderInReview({ email, batchId: batchIdA });
    const firstApproval = await approvePayment(first.publicOrderRef, "admin", EVENT_SOURCE_URL);
    if (firstApproval.kind !== "ok") throw new Error("setup failed");

    // A later enrollment for the same person, different batch, arrives with
    // an updated name/phone (e.g. they changed their number since Batch A).
    const registrationB = await upsertRegistration({
      masterclassSlug: constants.masterclassSlug,
      batchId: batchIdB,
      name: "Test Student (Updated Name)",
      email,
      emailNormalized: email,
      phone: "01799999999",
      phoneE164: "+8801799999999",
      marketingConsent: false,
      attribution: { capturedAt: new Date() },
    });
    const { order: orderB } = await createDraftOrder({
      registrationId: registrationB._id!,
      masterclassSlug: constants.masterclassSlug,
      batchId: batchIdB,
      amount: constants.resolvePriceBDT(),
      currency: constants.currency,
      idempotencyKey: randomUUID(),
      attribution: { capturedAt: new Date() },
      clientIpAddress: null,
      clientUserAgent: null,
    });
    await submitManualPayment({
      publicOrderRef: orderB.publicOrderRef,
      method: "BKASH",
      senderNumber: "+8801799999999",
      transactionIdRaw: `TXN-${randomUUID()}`,
    });

    const secondApproval = await approvePayment(orderB.publicOrderRef, "admin", EVENT_SOURCE_URL);
    if (secondApproval.kind !== "ok") throw new Error("second approval failed");

    expect(await countStudents()).toBe(1); // never duplicated across batches
    expect(secondApproval.order.studentId?.toHexString()).toBe(firstApproval.order.studentId?.toHexString());

    const db = await collections();
    const student = await db.collection(STUDENTS_COLLECTION).findOne({ _id: firstApproval.order.studentId! });
    expect(student?.name).toBe("Test Student (Updated Name)"); // most recently approved wins
    expect(student?.phone).toBe("01799999999");
    expect(student?.emailNormalized).toBe(email); // never changes
  });

  it("is idempotent: a second approval on an already-PAID order is a no-op, does not re-send the email, and does not create a second Student", async () => {
    const { publicOrderRef } = await seedOrderInReview();

    const first = await approvePayment(publicOrderRef, "admin", EVENT_SOURCE_URL);
    expect(first.kind).toBe("ok");
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(await countStudents()).toBe(1);

    const second = await approvePayment(publicOrderRef, "admin", EVENT_SOURCE_URL);
    expect(second.kind).toBe("already_processed");
    expect(sendMock).toHaveBeenCalledTimes(1); // still 1 — no duplicate send
    expect(await countStudents()).toBe(1); // still 1 — no duplicate Student
  });

  it("aborts the whole transaction with ApprovalConsistencyError if the order's registration cannot be found — never a PAID order with an unlinked registration or Student", async () => {
    const { publicOrderRef } = await seedOrderInReview();
    const db = await collections();

    // Simulate a data-integrity violation: the registration disappears out
    // from under a REVIEW order (should never happen in practice — this
    // is exactly the "zero-match/inconsistent state" case the transaction
    // must abort on, not silently paper over).
    const order = await findOrderByPublicRef(publicOrderRef);
    await db.collection(REGISTRATIONS_COLLECTION).deleteOne({ _id: order!.registrationId });

    await expect(approvePayment(publicOrderRef, "admin", EVENT_SOURCE_URL)).rejects.toThrow(
      ApprovalConsistencyError,
    );

    const afterAttempt = await findOrderByPublicRef(publicOrderRef);
    expect(afterAttempt?.status).toBe("REVIEW"); // never transitioned — the abort rolled back the whole transaction
    expect(await countStudents()).toBe(0);
    expect(sendMock).not.toHaveBeenCalled(); // email/CAPI never fire when the transaction never commits
  });

  it("a publicStudentId collision retries with a fresh transaction and still succeeds", async () => {
    // Pre-seed an unrelated, already-existing student occupying a known ID.
    const collidingId = "STU-234567892C";
    const db = await collections();
    await db.collection(STUDENTS_COLLECTION).insertOne({
      publicStudentId: collidingId,
      name: "Someone Else",
      email: "someone-else@example.com",
      emailNormalized: "someone-else@example.com",
      phone: "01711111111",
      phoneE164: "+8801711111111",
      status: "ACTIVE",
      mergedIntoStudentId: null,
      firstEnrolledAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    generateRandomStudentIdMock.mockImplementationOnce(() => collidingId);

    const { publicOrderRef } = await seedOrderInReview();
    const result = await approvePayment(publicOrderRef, "admin", EVENT_SOURCE_URL);

    expect(result.kind).toBe("ok");
    expect(generateRandomStudentIdMock).toHaveBeenCalledTimes(2); // one collision, one fresh retry
    expect(await countStudents()).toBe(2); // the pre-seeded one + the newly created one
    expect(sendMock).toHaveBeenCalledTimes(1); // exactly one email, from the winning attempt only
  });

  it("exhausts all 5 attempts with a persistent publicStudentId collision, throws StudentLinkGenerationError, and leaves zero partial state transitions", async () => {
    const collidingId = "STU-234567892C";
    const db = await collections();
    await db.collection(STUDENTS_COLLECTION).insertOne({
      publicStudentId: collidingId,
      name: "Someone Else",
      email: "someone-else@example.com",
      emailNormalized: "someone-else@example.com",
      phone: "01711111111",
      phoneE164: "+8801711111111",
      status: "ACTIVE",
      mergedIntoStudentId: null,
      firstEnrolledAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Every one of the bounded attempts collides — exactly 5 queued `Once`
    // implementations, so the mock automatically reverts to its real
    // default afterward, never permanently overridden.
    for (let i = 0; i < 5; i++) {
      generateRandomStudentIdMock.mockImplementationOnce(() => collidingId);
    }

    const { publicOrderRef, registrationRef } = await seedOrderInReview();

    await expect(approvePayment(publicOrderRef, "admin", EVENT_SOURCE_URL)).rejects.toThrow(
      StudentLinkGenerationError,
    );

    expect(generateRandomStudentIdMock).toHaveBeenCalledTimes(5); // bounded — never unbounded

    const order = await findOrderByPublicRef(publicOrderRef);
    expect(order?.status).toBe("REVIEW"); // never transitioned to PAID
    const registration = await findRegistrationByPublicRef(registrationRef);
    expect(registration?.status).toBe("PENDING_PAYMENT"); // never transitioned to ENROLLED — every attempt's transaction aborted
    expect(await countStudents()).toBe(1); // only the pre-seeded one — no new Student, no orphan
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("two concurrent approvals for the same email across different batches both succeed and converge on exactly one Student", async () => {
    const email = `concurrent-${randomUUID()}@example.com`;
    const batchIdA = `${constants.batchId}-concurrent-a`;
    const batchIdB = `${constants.batchId}-concurrent-b`;

    const [a, b] = await Promise.all([
      seedOrderInReview({ email, batchId: batchIdA }),
      seedOrderInReview({ email, batchId: batchIdB }),
    ]);

    const [resultA, resultB] = await Promise.all([
      approvePayment(a.publicOrderRef, "admin", EVENT_SOURCE_URL),
      approvePayment(b.publicOrderRef, "admin", EVENT_SOURCE_URL),
    ]);

    expect(resultA.kind).toBe("ok");
    expect(resultB.kind).toBe("ok");
    if (resultA.kind !== "ok" || resultB.kind !== "ok") throw new Error("unreachable");

    expect(await countStudents()).toBe(1);
    expect(resultA.order.studentId?.toHexString()).toBe(resultB.order.studentId?.toHexString());

    const registrationA = await findRegistrationByPublicRef(a.registrationRef);
    const registrationB = await findRegistrationByPublicRef(b.registrationRef);
    expect(registrationA?.studentId?.toHexString()).toBe(resultA.order.studentId?.toHexString());
    expect(registrationB?.studentId?.toHexString()).toBe(resultA.order.studentId?.toHexString());

    // Each legitimate approval still produced only its own post-commit
    // side effect — two students approved, two confirmation emails, never
    // more (no duplicate send from the loser's retry).
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it("a Resend failure is recorded but never rolls back the PAID transition, the enrollment, or the Student link", async () => {
    sendMock.mockRejectedValue(new Error("network down"));
    const { publicOrderRef, registrationRef } = await seedOrderInReview();

    const result = await approvePayment(publicOrderRef, "admin", EVENT_SOURCE_URL);
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") expect(result.order.status).toBe("PAID");

    const registration = await findRegistrationByPublicRef(registrationRef);
    expect(registration?.status).toBe("ENROLLED");
    expect(registration?.studentId).toBeInstanceOf(ObjectId);

    const order = await findOrderByPublicRef(publicOrderRef);
    expect(order?.confirmationEmail.status).toBe("FAILED");
    expect(order?.confirmationEmail.lastErrorCode).toBe("NETWORK_ERROR");
  });

  it("fires Meta CAPI with the order's deterministic event_id when META env is configured", async () => {
    vi.stubEnv("META_PIXEL_ID", "1234567890");
    vi.stubEnv("META_CAPI_ACCESS_TOKEN", "capi-token");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    const { publicOrderRef } = await seedOrderInReview();
    await approvePayment(publicOrderRef, "admin", EVENT_SOURCE_URL);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/1234567890/events");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.data[0].event_id).toBe(`purchase_${publicOrderRef}`);
    expect(body.data[0].event_name).toBe("Purchase");

    const order = await findOrderByPublicRef(publicOrderRef);
    expect(order?.purchaseCapi.status).toBe("SENT");
  });
});

describe("rejectPaymentOrder", () => {
  it("moves REVIEW -> REJECTED and is idempotent on a second call", async () => {
    const { publicOrderRef } = await seedOrderInReview();

    const first = await rejectPaymentOrder(publicOrderRef, "admin", "Transaction ID not found in provider statement.");
    expect(first.kind).toBe("ok");
    if (first.kind === "ok") expect(first.order.status).toBe("REJECTED");

    const second = await rejectPaymentOrder(publicOrderRef, "admin", "irrelevant");
    expect(second.kind).toBe("already_processed");
  });

  it("never creates a Student for a rejected order", async () => {
    const { publicOrderRef } = await seedOrderInReview();
    await rejectPaymentOrder(publicOrderRef, "admin", "not verifiable");
    expect(await countStudents()).toBe(0);
  });

  it("sends exactly one rejection email, to the registrant's own address, keyed by the order's own ref, only on the winning transition", async () => {
    const { publicOrderRef, registrationRef } = await seedOrderInReview();
    const registration = await findRegistrationByPublicRef(registrationRef);

    const first = await rejectPaymentOrder(publicOrderRef, "admin", "not verifiable");
    expect(first.kind).toBe("ok");
    expect(sendMock).toHaveBeenCalledTimes(1);
    const [emailPayload, options] = sendMock.mock.calls[0];
    expect(emailPayload.to).toBe(registration?.email);
    expect(emailPayload.subject).toBe("আপনার পেমেন্ট যাচাই করা যায়নি — মাস্টার ক্লাস");
    expect(options).toEqual({ idempotencyKey: `masterclass-rejection-${publicOrderRef}` });

    const order = await findOrderByPublicRef(publicOrderRef);
    expect(order?.rejectionEmail.status).toBe("SENT");
    expect(order?.status).toBe("REJECTED"); // never re-verified as PAID by anything above

    // A repeated/duplicate reject (refresh, double-click) must never send a second email.
    const second = await rejectPaymentOrder(publicOrderRef, "admin", "irrelevant");
    expect(second.kind).toBe("already_processed");
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("does not send an email for not_found or already_processed outcomes", async () => {
    const notFound = await rejectPaymentOrder("ord_does-not-exist", "admin", null);
    expect(notFound.kind).toBe("not_found");
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("escapes the student's name in the rejection email HTML", async () => {
    const email = `xss-${randomUUID()}@example.com`;
    const registration = await upsertRegistration({
      masterclassSlug: constants.masterclassSlug,
      batchId: constants.batchId,
      name: '<img src=x onerror=alert(1)>',
      email,
      emailNormalized: email,
      phone: "01712345678",
      phoneE164: "+8801712345678",
      marketingConsent: false,
      attribution: { capturedAt: new Date() },
    });
    const { order } = await createDraftOrder({
      registrationId: registration._id!,
      masterclassSlug: constants.masterclassSlug,
      batchId: constants.batchId,
      amount: constants.resolvePriceBDT(),
      currency: constants.currency,
      idempotencyKey: randomUUID(),
      attribution: { capturedAt: new Date() },
      clientIpAddress: null,
      clientUserAgent: null,
    });
    await submitManualPayment({
      publicOrderRef: order.publicOrderRef,
      method: "BKASH",
      senderNumber: "+8801712345678",
      transactionIdRaw: `TXN-${randomUUID()}`,
    });

    await rejectPaymentOrder(order.publicOrderRef, "admin", null);

    const [emailPayload] = sendMock.mock.calls[0];
    expect(emailPayload.html).not.toContain("<img src=x onerror=alert(1)>");
    expect(emailPayload.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("a Resend failure is recorded but never rolls back the REJECTED transition", async () => {
    sendMock.mockRejectedValue(new Error("network down"));
    const { publicOrderRef } = await seedOrderInReview();

    const result = await rejectPaymentOrder(publicOrderRef, "admin", "not verifiable");
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") expect(result.order.status).toBe("REJECTED");

    const order = await findOrderByPublicRef(publicOrderRef);
    expect(order?.status).toBe("REJECTED");
    expect(order?.rejectionEmail.status).toBe("FAILED");
    expect(order?.rejectionEmail.lastErrorCode).toBe("NETWORK_ERROR");
  });

  it("never triggers a Meta Pixel/CAPI Purchase event for a rejection", async () => {
    vi.stubEnv("META_PIXEL_ID", "1234567890");
    vi.stubEnv("META_CAPI_ACCESS_TOKEN", "capi-token");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    const { publicOrderRef } = await seedOrderInReview();
    await rejectPaymentOrder(publicOrderRef, "admin", "not verifiable");

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("retryDelivery", () => {
  it("re-attempts only the deliveries that aren't SENT yet, without duplicating an already-SENT one", async () => {
    const { publicOrderRef } = await seedOrderInReview();
    await approvePayment(publicOrderRef, "admin", EVENT_SOURCE_URL); // email SENT, CAPI FAILED (not configured)
    expect(sendMock).toHaveBeenCalledTimes(1);

    await retryDelivery(publicOrderRef, EVENT_SOURCE_URL);

    // Email was already SENT — retryDelivery must not call Resend again for it.
    expect(sendMock).toHaveBeenCalledTimes(1);

    const order = await findOrderByPublicRef(publicOrderRef);
    expect(order?.confirmationEmail.status).toBe("SENT");
    expect(order?.purchaseCapi.attempts).toBeGreaterThanOrEqual(2); // retried since it wasn't SENT
  });

  it("retries a REJECTED order's rejection email when it previously failed, and never re-sends once it's SENT", async () => {
    sendMock.mockRejectedValueOnce(new Error("network down"));
    const { publicOrderRef } = await seedOrderInReview();
    await rejectPaymentOrder(publicOrderRef, "admin", "not verifiable");
    let order = await findOrderByPublicRef(publicOrderRef);
    expect(order?.rejectionEmail.status).toBe("FAILED");

    sendMock.mockResolvedValue({ data: { id: "email_2" }, error: null });
    await retryDelivery(publicOrderRef, EVENT_SOURCE_URL);
    order = await findOrderByPublicRef(publicOrderRef);
    expect(order?.rejectionEmail.status).toBe("SENT");
    expect(sendMock).toHaveBeenCalledTimes(2);

    // Already SENT — a further retry call must not send a third email.
    await retryDelivery(publicOrderRef, EVENT_SOURCE_URL);
    expect(sendMock).toHaveBeenCalledTimes(2);
  });
});
