// Must be the first import — sets MONGODB_URI to an isolated in-memory
// instance before env.ts / mongoose.ts / any masterclass module is imported.
import { mongod } from "../helpers/mongodb-memory-server";

import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.hoisted(() => vi.fn());
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

import { connectToDatabase } from "@/lib/mongoose";
import * as constants from "@/lib/masterclass/constants";
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
import { approvePayment, rejectPaymentOrder, retryDelivery } from "@/lib/masterclass/verify-service";

const EVENT_SOURCE_URL = "https://outboundbd.com/masterclass/lead-generation-cold-email";

async function seedOrderInReview() {
  const email = `student-${randomUUID()}@example.com`;
  const registration = await upsertRegistration({
    masterclassSlug: constants.masterclassSlug,
    batchId: constants.batchId,
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
  return { publicOrderRef: order.publicOrderRef, registrationRef: registration.publicRegistrationRef };
}

beforeAll(async () => {
  await connectToDatabase();
});

beforeEach(async () => {
  const connection = await connectToDatabase();
  const db = connection.connection.db!;
  await Promise.all([
    db.collection(REGISTRATIONS_COLLECTION).deleteMany({}),
    db.collection(PAYMENT_ORDERS_COLLECTION).deleteMany({}),
    db.collection(COUNTERS_COLLECTION).deleteMany({}),
  ]);
  sendMock.mockReset();
  sendMock.mockResolvedValue({ data: { id: "email_1" }, error: null });
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

  it("moves REVIEW -> PAID, enrolls the registration, and sends a confirmation email (Resend mocked)", async () => {
    const { publicOrderRef, registrationRef } = await seedOrderInReview();

    const result = await approvePayment(publicOrderRef, "admin", EVENT_SOURCE_URL);
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.order.status).toBe("PAID");
      expect(result.order.verifiedBy).toBe("admin");
    }

    const registration = await findRegistrationByPublicRef(registrationRef);
    expect(registration?.status).toBe("ENROLLED");

    expect(sendMock).toHaveBeenCalledTimes(1);
    const [, options] = sendMock.mock.calls[0];
    expect(options).toEqual({ idempotencyKey: `masterclass-confirmation-${registrationRef}` });

    const order = await findOrderByPublicRef(publicOrderRef);
    expect(order?.confirmationEmail.status).toBe("SENT");
    // Meta CAPI isn't configured in this test env, so it must fail soft, not throw.
    expect(order?.purchaseCapi.status).toBe("FAILED");
    expect(order?.purchaseCapi.lastErrorCode).toBe("CAPI_NOT_CONFIGURED");
  });

  it("is idempotent: a second approval on an already-PAID order is a no-op and does not re-send the email", async () => {
    const { publicOrderRef } = await seedOrderInReview();

    const first = await approvePayment(publicOrderRef, "admin", EVENT_SOURCE_URL);
    expect(first.kind).toBe("ok");
    expect(sendMock).toHaveBeenCalledTimes(1);

    const second = await approvePayment(publicOrderRef, "admin", EVENT_SOURCE_URL);
    expect(second.kind).toBe("already_processed");
    expect(sendMock).toHaveBeenCalledTimes(1); // still 1 — no duplicate send
  });

  it("a Resend failure is recorded but never rolls back the PAID transition or the enrollment", async () => {
    sendMock.mockRejectedValue(new Error("network down"));
    const { publicOrderRef, registrationRef } = await seedOrderInReview();

    const result = await approvePayment(publicOrderRef, "admin", EVENT_SOURCE_URL);
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") expect(result.order.status).toBe("PAID");

    const registration = await findRegistrationByPublicRef(registrationRef);
    expect(registration?.status).toBe("ENROLLED");

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
