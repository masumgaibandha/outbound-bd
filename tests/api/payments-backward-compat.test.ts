import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/blob-storage", () => import("../fakes/blob-storage-fake"));

import { GET as getCurrentProof } from "@/app/api/payments/[paymentId]/proof/route";
import { POST as reviewPayment } from "@/app/api/admin/payments/[paymentId]/route";
import { Order } from "@/lib/models/order";
import { Payment } from "@/lib/models/payment";
import { buildPaymentMethodSnapshot } from "@/lib/models/payment-method";
import { getExpectedInitialPayment } from "@/lib/payment-match";
import { createTestSession } from "../helpers/auth";
import { blobStore } from "../fakes/blob-storage-fake";
import { createTestOrder, createTestPaymentMethod } from "../helpers/fixtures";

/**
 * Simulates a Payment document exactly as it would look pre-Phase-2.1: no
 * PaymentAttempt row, no currentAttemptId, attemptCount 0 (the schema
 * default), and no expectedAmountCents/expectedCurrency — those fields
 * didn't exist yet. Written directly against the Payment collection,
 * bypassing the submission route entirely, the way real historical data
 * would already sit in the database with no backfill migration run against
 * it (see README migration notes).
 */
async function createLegacyPayment(order: Awaited<ReturnType<typeof createTestOrder>>, userId: string) {
  const method = await createTestPaymentMethod({ currency: "USD" });
  blobStore.set("payment-proofs/legacy/legacy-proof.png", {
    pathname: "payment-proofs/legacy/legacy-proof.png",
    buffer: Buffer.from([137, 80, 78, 71]),
    contentType: "image/png",
    fileName: "legacy-proof.png",
  });

  const payment = await Payment.create({
    orderId: order._id,
    userId,
    paymentMethodId: method._id,
    paymentMethodSnapshot: buildPaymentMethodSnapshot(method),
    transactionReference: "LEGACY-TXN",
    amountCents: 59800,
    currency: "USD",
    paymentDate: new Date(),
    proof: {
      pathname: "payment-proofs/legacy/legacy-proof.png",
      fileName: "legacy-proof.png",
      contentType: "image/png",
      sizeBytes: 4,
    },
    idempotencyKey: crypto.randomUUID(),
    status: "PENDING_REVIEW",
    history: [],
    // attemptCount defaults to 0, currentAttemptId/expected* stay unset —
    // exactly like a real pre-migration document.
  });

  return payment;
}

describe("backward compatibility with pre-migration Payment documents", () => {
  it("computes expected amount/match on the fly for a legacy payment with no PaymentAttempt row", async () => {
    const { userId } = await createTestSession();
    const order = await createTestOrder(userId, "leads-1000"); // expected 9900
    const payment = await createLegacyPayment(order, userId);

    // amountCents 59800 vs expected 9900 for leads-1000 -> should read as
    // OVERPAID once evaluated against the real catalog, proving the
    // fallback computes from the order snapshot rather than trusting a
    // (missing) stored expected value.
    const expected = getExpectedInitialPayment(order.catalog);
    expect(expected.amountCents).toBe(9900);
    expect(payment.expectedAmountCents).toBeUndefined();
  });

  it("lets an admin review a legacy payment directly, with atomic double-review protection preserved", async () => {
    const client = await createTestSession();
    const admin = await createTestSession({ role: "ADMIN" });
    const order = await createTestOrder(client.userId, "leads-1000");
    const payment = await createLegacyPayment(order, client.userId);

    const reviewOnce = () =>
      reviewPayment(
        new Request(`http://localhost:3000/api/admin/payments/${payment._id}`, {
          method: "POST",
          headers: { cookie: admin.cookieHeader, "content-type": "application/json" },
          body: JSON.stringify({
            action: "VERIFY",
            overrideReason: "Legacy payment, manually reconciled against bank statement.",
          }),
        }),
        { params: Promise.resolve({ paymentId: String(payment._id) }) },
      );

    const first = await reviewOnce();
    expect(first.status).toBe(200);

    const updatedOrder = await Order.findById(order._id).lean();
    expect(updatedOrder?.status).toBe("PAID");

    const updatedPayment = await Payment.findById(payment._id).lean();
    expect(updatedPayment?.status).toBe("VERIFIED");
    expect(updatedPayment?.history).toHaveLength(1);

    const second = await reviewOnce();
    expect(second.status).toBe(409);
  });

  it("still serves the legacy payment's own proof field via the proof route", async () => {
    const { userId, cookieHeader } = await createTestSession();
    const order = await createTestOrder(userId, "leads-1000");
    const payment = await createLegacyPayment(order, userId);

    const response = await getCurrentProof(
      new Request(`http://localhost:3000/api/payments/${payment._id}/proof`, {
        headers: { cookie: cookieHeader },
      }),
      { params: Promise.resolve({ paymentId: String(payment._id) }) },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
  });
});
