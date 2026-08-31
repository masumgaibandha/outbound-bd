import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/blob-storage", () => import("../fakes/blob-storage-fake"));

import { POST as submitPayment } from "@/app/api/orders/[orderId]/payments/route";
import { PaymentAttempt } from "@/lib/models/payment-attempt";
import { Payment } from "@/lib/models/payment";
import { Order } from "@/lib/models/order";
import { getExpectedInitialPayment } from "@/lib/payment-match";
import { getCatalogEntryById } from "@/lib/pricing-catalog";
import { createTestSession } from "../helpers/auth";
import { buildProofFile, createTestOrder, createTestPaymentMethod } from "../helpers/fixtures";
import { blobStore, resetBlobFake } from "../fakes/blob-storage-fake";

function submissionRequest(
  orderId: string,
  cookieHeader: string,
  fields: Record<string, string>,
  proof: File | null = buildProofFile(),
) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  if (proof) formData.set("proof", proof);
  return new Request(`http://localhost:3000/api/orders/${orderId}/payments`, {
    method: "POST",
    headers: { cookie: cookieHeader },
    body: formData,
  });
}

async function callSubmit(orderId: string, cookieHeader: string, fields: Record<string, string>, proof?: File | null) {
  const response = await submitPayment(submissionRequest(orderId, cookieHeader, fields, proof), {
    params: Promise.resolve({ orderId }),
  });
  const json = (await response.json()) as Record<string, unknown>;
  return { response, json };
}

describe("POST /api/orders/[orderId]/payments", () => {
  afterEach(() => {
    resetBlobFake();
  });

  it("stores the server-computed expected amount/currency for a recurring plan order", async () => {
    const { userId, cookieHeader } = await createTestSession();
    const order = await createTestOrder(userId, "launch");
    const method = await createTestPaymentMethod({ currency: "USD" });

    const { response, json } = await callSubmit(String(order._id), cookieHeader, {
      paymentMethodId: String(method._id),
      transactionReference: "TXN-001",
      amountCents: "59800",
      paymentDate: new Date().toISOString().slice(0, 10),
      idempotencyKey: crypto.randomUUID(),
    });

    expect(response.status).toBe(201);
    expect(json.ok).toBe(true);

    const attempt = await PaymentAttempt.findById(json.attemptId as string).lean();
    const expected = getExpectedInitialPayment(order.catalog);
    expect(attempt?.expectedAmountCents).toBe(expected.amountCents);
    expect(attempt?.expectedCurrency).toBe(expected.currency);
    expect(attempt?.attemptNumber).toBe(1);
  });

  it("stores the flat one-time price as the expected amount for a one-time offer", async () => {
    const { userId, cookieHeader } = await createTestSession();
    const order = await createTestOrder(userId, "leads-1000");
    const method = await createTestPaymentMethod({ currency: "USD" });
    const entry = getCatalogEntryById("leads-1000");

    const { json } = await callSubmit(String(order._id), cookieHeader, {
      paymentMethodId: String(method._id),
      transactionReference: "TXN-002",
      amountCents: "9900",
      paymentDate: new Date().toISOString().slice(0, 10),
      idempotencyKey: crypto.randomUUID(),
    });

    const attempt = await PaymentAttempt.findById(json.attemptId as string).lean();
    expect(entry?.kind).toBe("one-time-offer");
    expect(attempt?.expectedAmountCents).toBe(9900);
  });

  it("derives currency from the selected payment method server-side, ignoring anything the client claims", async () => {
    const { userId, cookieHeader } = await createTestSession();
    const order = await createTestOrder(userId, "leads-1000");
    const method = await createTestPaymentMethod({ currency: "GBP" });

    // The submission schema no longer even accepts a `currency` field, but
    // assert the stored value regardless: it must equal the *method's*
    // currency, never anything else.
    const { json } = await callSubmit(String(order._id), cookieHeader, {
      paymentMethodId: String(method._id),
      transactionReference: "TXN-003",
      amountCents: "9900",
      paymentDate: new Date().toISOString().slice(0, 10),
      idempotencyKey: crypto.randomUUID(),
    });

    const attempt = await PaymentAttempt.findById(json.attemptId as string).lean();
    expect(attempt?.currency).toBe("GBP");
  });

  it("returns 401 for an unauthenticated request", async () => {
    const order = await createTestOrder((await createTestSession()).userId);
    const response = await submitPayment(
      submissionRequest(String(order._id), "", {
        paymentMethodId: "000000000000000000000000",
        transactionReference: "TXN",
        amountCents: "100",
        paymentDate: "2026-01-01",
        idempotencyKey: crypto.randomUUID(),
      }),
      { params: Promise.resolve({ orderId: String(order._id) }) },
    );
    expect(response.status).toBe(401);
  });

  it("404s when the order belongs to a different user, without confirming its existence", async () => {
    const owner = await createTestSession();
    const attacker = await createTestSession();
    const order = await createTestOrder(owner.userId);
    const method = await createTestPaymentMethod();

    const { response, json } = await callSubmit(String(order._id), attacker.cookieHeader, {
      paymentMethodId: String(method._id),
      transactionReference: "TXN",
      amountCents: "100",
      paymentDate: "2026-01-01",
      idempotencyKey: crypto.randomUUID(),
    });

    expect(response.status).toBe(404);
    expect(json.message).toBe("Order not found.");
  });

  it("is idempotent: retrying the same key returns the original attempt instead of creating a second one", async () => {
    const { userId, cookieHeader } = await createTestSession();
    const order = await createTestOrder(userId);
    const method = await createTestPaymentMethod();
    const idempotencyKey = crypto.randomUUID();
    const fields = {
      paymentMethodId: String(method._id),
      transactionReference: "TXN-IDEMPOTENT",
      amountCents: "59800",
      paymentDate: new Date().toISOString().slice(0, 10),
      idempotencyKey,
    };

    const first = await callSubmit(String(order._id), cookieHeader, fields);
    expect(first.response.status).toBe(201);

    const second = await callSubmit(String(order._id), cookieHeader, fields);
    expect(second.response.status).toBe(200);
    expect(second.json.attemptId).toBe(first.json.attemptId);

    const count = await PaymentAttempt.countDocuments({ orderId: order._id });
    expect(count).toBe(1);
  });

  it("rejects a retried idempotency key that belongs to a different user", async () => {
    const owner = await createTestSession();
    const other = await createTestSession();
    const order = await createTestOrder(owner.userId);
    const method = await createTestPaymentMethod();
    const idempotencyKey = crypto.randomUUID();
    const fields = {
      paymentMethodId: String(method._id),
      transactionReference: "TXN",
      amountCents: "59800",
      paymentDate: new Date().toISOString().slice(0, 10),
      idempotencyKey,
    };

    await callSubmit(String(order._id), owner.cookieHeader, fields);

    const otherOrder = await createTestOrder(other.userId);
    const { response, json } = await callSubmit(String(otherOrder._id), other.cookieHeader, fields);
    expect(response.status).toBe(409);
    expect(json.ok).toBe(false);
  });

  it("rejects a second concurrent-style submission against the same order once it's left AWAITING_PAYMENT", async () => {
    const { userId, cookieHeader } = await createTestSession();
    const order = await createTestOrder(userId);
    const method = await createTestPaymentMethod();

    const first = await callSubmit(String(order._id), cookieHeader, {
      paymentMethodId: String(method._id),
      transactionReference: "TXN-A",
      amountCents: "59800",
      paymentDate: new Date().toISOString().slice(0, 10),
      idempotencyKey: crypto.randomUUID(),
    });
    expect(first.response.status).toBe(201);

    const second = await callSubmit(String(order._id), cookieHeader, {
      paymentMethodId: String(method._id),
      transactionReference: "TXN-B",
      amountCents: "59800",
      paymentDate: new Date().toISOString().slice(0, 10),
      idempotencyKey: crypto.randomUUID(),
    });
    expect(second.response.status).toBe(409);
  });

  it("creates a new PaymentAttempt (not an overwrite) on resubmission after rejection, preserving both proofs", async () => {
    const { userId, cookieHeader } = await createTestSession();
    const order = await createTestOrder(userId);
    const method = await createTestPaymentMethod();

    const first = await callSubmit(
      String(order._id),
      cookieHeader,
      {
        paymentMethodId: String(method._id),
        transactionReference: "TXN-FIRST",
        amountCents: "59800",
        paymentDate: new Date().toISOString().slice(0, 10),
        idempotencyKey: crypto.randomUUID(),
      },
      buildProofFile("first-proof.png"),
    );
    expect(first.response.status).toBe(201);
    const firstAttempt = await PaymentAttempt.findById(first.json.attemptId as string).lean();
    expect(blobStore.has(firstAttempt!.proof.pathname)).toBe(true);

    // Admin rejects it, which returns the order to AWAITING_PAYMENT — reuse
    // the raw Payment/Order update here to isolate this test from the
    // review route (covered separately in payments-review.test.ts).
    await Payment.updateOne({ _id: first.json.paymentId as string }, { status: "AWAITING_PAYMENT" });
    await PaymentAttempt.updateOne({ _id: first.json.attemptId as string }, { status: "REJECTED" });
    await Order.updateOne({ _id: order._id }, { status: "AWAITING_PAYMENT" });

    const second = await callSubmit(
      String(order._id),
      cookieHeader,
      {
        paymentMethodId: String(method._id),
        transactionReference: "TXN-SECOND",
        amountCents: "59800",
        paymentDate: new Date().toISOString().slice(0, 10),
        idempotencyKey: crypto.randomUUID(),
      },
      buildProofFile("second-proof.png"),
    );
    expect(second.response.status).toBe(201);
    expect(second.json.attemptId).not.toBe(first.json.attemptId);

    const attempts = await PaymentAttempt.find({ orderId: order._id }).sort({ attemptNumber: 1 }).lean();
    expect(attempts).toHaveLength(2);
    expect(attempts[0].status).toBe("REJECTED");
    expect(attempts[0].transactionReference).toBe("TXN-FIRST");
    expect(attempts[1].transactionReference).toBe("TXN-SECOND");
    // The first attempt's proof must still be present — a resubmission
    // must never delete or overwrite a prior, already-stored attempt's proof.
    expect(blobStore.has(attempts[0].proof.pathname)).toBe(true);
    expect(blobStore.has(attempts[1].proof.pathname)).toBe(true);
    expect(attempts[0].proof.pathname).not.toBe(attempts[1].proof.pathname);

    const payment = await Payment.findById(first.json.paymentId as string).lean();
    expect(payment?.attemptCount).toBe(2);
    expect(String(payment?.currentAttemptId)).toBe(String(attempts[1]._id));
  });
});
