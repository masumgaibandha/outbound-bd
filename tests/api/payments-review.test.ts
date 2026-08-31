import { afterEach, describe, expect, it } from "vitest";

import { vi } from "vitest";
vi.mock("@/lib/blob-storage", () => import("../fakes/blob-storage-fake"));

import { POST as submitPayment } from "@/app/api/orders/[orderId]/payments/route";
import { POST as reviewPayment } from "@/app/api/admin/payments/[paymentId]/route";
import { Order } from "@/lib/models/order";
import { Payment } from "@/lib/models/payment";
import { PaymentAttempt } from "@/lib/models/payment-attempt";
import { createTestSession } from "../helpers/auth";
import { buildProofFile, createTestOrder, createTestPaymentMethod } from "../helpers/fixtures";
import { resetBlobFake } from "../fakes/blob-storage-fake";

async function submitAndGetIds(userId: string, cookieHeader: string, opts: { amountCents: string; currency?: "USD" | "GBP" }) {
  const order = await createTestOrder(userId, "leads-1000"); // expected = 9900
  const method = await createTestPaymentMethod({ currency: opts.currency ?? "USD" });

  const formData = new FormData();
  formData.set("paymentMethodId", String(method._id));
  formData.set("transactionReference", "TXN");
  formData.set("amountCents", opts.amountCents);
  formData.set("paymentDate", new Date().toISOString().slice(0, 10));
  formData.set("idempotencyKey", crypto.randomUUID());
  formData.set("proof", buildProofFile());

  const response = await submitPayment(
    new Request(`http://localhost:3000/api/orders/${order._id}/payments`, {
      method: "POST",
      headers: { cookie: cookieHeader },
      body: formData,
    }),
    { params: Promise.resolve({ orderId: String(order._id) }) },
  );
  const json = (await response.json()) as { paymentId: string; attemptId: string };
  return { order, paymentId: json.paymentId, attemptId: json.attemptId };
}

function reviewRequest(paymentId: string, cookieHeader: string, body: Record<string, unknown>) {
  return reviewPayment(
    new Request(`http://localhost:3000/api/admin/payments/${paymentId}`, {
      method: "POST",
      headers: { cookie: cookieHeader, "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ paymentId }) },
  );
}

describe("POST /api/admin/payments/[paymentId]", () => {
  afterEach(() => {
    resetBlobFake();
  });

  it("verifies a matching payment without requiring an override reason", async () => {
    const client = await createTestSession();
    const admin = await createTestSession({ role: "ADMIN" });
    const { order, paymentId } = await submitAndGetIds(client.userId, client.cookieHeader, { amountCents: "9900" });

    const response = await reviewRequest(paymentId, admin.cookieHeader, { action: "VERIFY" });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe("VERIFIED");
    expect(json.orderStatus).toBe("PAID");

    const updatedOrder = await Order.findById(order._id).lean();
    expect(updatedOrder?.status).toBe("PAID");
  });

  it("refuses to verify an underpaid attempt without an override reason", async () => {
    const client = await createTestSession();
    const admin = await createTestSession({ role: "ADMIN" });
    const { paymentId } = await submitAndGetIds(client.userId, client.cookieHeader, { amountCents: "5000" });

    const response = await reviewRequest(paymentId, admin.cookieHeader, { action: "VERIFY" });
    expect(response.status).toBe(400);

    const payment = await Payment.findById(paymentId).lean();
    expect(payment?.status).toBe("PENDING_REVIEW");
  });

  it("refuses an override reason shorter than the minimum length", async () => {
    const client = await createTestSession();
    const admin = await createTestSession({ role: "ADMIN" });
    const { paymentId } = await submitAndGetIds(client.userId, client.cookieHeader, { amountCents: "5000" });

    const response = await reviewRequest(paymentId, admin.cookieHeader, {
      action: "VERIFY",
      overrideReason: "too short",
    });
    expect(response.status).toBe(400);
  });

  it("verifies an underpaid attempt when a sufficient override reason is given, and records it in history", async () => {
    const client = await createTestSession();
    const admin = await createTestSession({ role: "ADMIN" });
    const { order, paymentId, attemptId } = await submitAndGetIds(client.userId, client.cookieHeader, {
      amountCents: "5000",
    });

    const response = await reviewRequest(paymentId, admin.cookieHeader, {
      action: "VERIFY",
      overrideReason: "Client paid the remainder in cash, confirmed by phone.",
    });
    expect(response.status).toBe(200);

    const attempt = await PaymentAttempt.findById(attemptId).lean();
    expect(attempt?.status).toBe("VERIFIED");
    expect(attempt?.overrideReason).toContain("cash");

    const payment = await Payment.findById(paymentId).lean();
    expect(payment?.overrideReason).toContain("cash");
    const lastHistoryEntry = payment?.history[payment.history.length - 1];
    expect(lastHistoryEntry?.status).toBe("VERIFIED");
    expect(lastHistoryEntry?.actorRole).toBe("ADMIN");

    const updatedOrder = await Order.findById(order._id).lean();
    expect(updatedOrder?.status).toBe("PAID");
  });

  it("flags a currency mismatch and still requires an override to verify", async () => {
    const client = await createTestSession();
    const admin = await createTestSession({ role: "ADMIN" });
    const { paymentId } = await submitAndGetIds(client.userId, client.cookieHeader, {
      amountCents: "9900",
      currency: "GBP",
    });

    const withoutOverride = await reviewRequest(paymentId, admin.cookieHeader, { action: "VERIFY" });
    expect(withoutOverride.status).toBe(400);

    const withOverride = await reviewRequest(paymentId, admin.cookieHeader, {
      action: "VERIFY",
      overrideReason: "Client paid the GBP equivalent, confirmed the FX conversion manually.",
    });
    expect(withOverride.status).toBe(200);
  });

  it("prevents a second review action from winning after the first (double-review protection)", async () => {
    const client = await createTestSession();
    const admin = await createTestSession({ role: "ADMIN" });
    const { paymentId } = await submitAndGetIds(client.userId, client.cookieHeader, { amountCents: "9900" });

    const first = await reviewRequest(paymentId, admin.cookieHeader, { action: "VERIFY" });
    expect(first.status).toBe(200);

    const second = await reviewRequest(paymentId, admin.cookieHeader, { action: "REJECT", reason: "too late" });
    expect(second.status).toBe(409);

    const payment = await Payment.findById(paymentId).lean();
    expect(payment?.status).toBe("VERIFIED");
  });

  it("returns the order to AWAITING_PAYMENT on rejection and resubmission-request", async () => {
    const client = await createTestSession();
    const admin = await createTestSession({ role: "ADMIN" });
    const { order, paymentId } = await submitAndGetIds(client.userId, client.cookieHeader, { amountCents: "9900" });

    const response = await reviewRequest(paymentId, admin.cookieHeader, {
      action: "REJECT",
      reason: "Proof is illegible.",
    });
    expect(response.status).toBe(200);

    const updatedOrder = await Order.findById(order._id).lean();
    expect(updatedOrder?.status).toBe("AWAITING_PAYMENT");
  });

  it("returns 403 for a signed-in non-admin", async () => {
    const client = await createTestSession();
    const { paymentId } = await submitAndGetIds(client.userId, client.cookieHeader, { amountCents: "9900" });

    const response = await reviewRequest(paymentId, client.cookieHeader, { action: "VERIFY" });
    expect(response.status).toBe(403);
  });

  it("returns 401 for an unauthenticated request", async () => {
    const client = await createTestSession();
    const { paymentId } = await submitAndGetIds(client.userId, client.cookieHeader, { amountCents: "9900" });

    const response = await reviewRequest(paymentId, "", { action: "VERIFY" });
    expect(response.status).toBe(401);
  });
});
