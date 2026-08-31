import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/blob-storage", () => import("../fakes/blob-storage-fake"));

import { POST as submitPayment } from "@/app/api/orders/[orderId]/payments/route";
import { Order } from "@/lib/models/order";
import { Payment } from "@/lib/models/payment";
import { PaymentAttempt } from "@/lib/models/payment-attempt";
import { createTestSession } from "../helpers/auth";
import { buildProofFile, createTestOrder, createTestPaymentMethod } from "../helpers/fixtures";
import { blobStore, deletedPathnames, resetBlobFake } from "../fakes/blob-storage-fake";

describe("orphaned-blob cleanup on submission failure", () => {
  afterEach(() => {
    resetBlobFake();
    vi.restoreAllMocks();
  });

  it("deletes the just-uploaded proof and rolls back the order when the Payment write fails after upload", async () => {
    const { userId, cookieHeader } = await createTestSession();
    const order = await createTestOrder(userId);
    const method = await createTestPaymentMethod();

    const failure = new Error("simulated database failure");
    const spy = vi.spyOn(Payment, "findOneAndUpdate").mockRejectedValueOnce(failure);

    const formData = new FormData();
    formData.set("paymentMethodId", String(method._id));
    formData.set("transactionReference", "TXN-FAIL");
    formData.set("amountCents", "59800");
    formData.set("paymentDate", new Date().toISOString().slice(0, 10));
    formData.set("idempotencyKey", crypto.randomUUID());
    formData.set("proof", buildProofFile("will-be-orphaned.png"));

    const response = await submitPayment(
      new Request(`http://localhost:3000/api/orders/${order._id}/payments`, {
        method: "POST",
        headers: { cookie: cookieHeader },
        body: formData,
      }),
      { params: Promise.resolve({ orderId: String(order._id) }) },
    );

    expect(response.status).toBe(500);
    expect(spy).toHaveBeenCalled();

    // Exactly one blob was uploaded during this request, and it must have
    // been deleted — never left behind as an orphan, and never left in a
    // state where some *other* file gets deleted instead.
    expect(deletedPathnames).toHaveLength(1);
    expect(blobStore.size).toBe(0);

    // No PaymentAttempt or Payment record exists for the failed write — the
    // failure happened before either was created.
    expect(await PaymentAttempt.countDocuments({ orderId: order._id })).toBe(0);
    expect(await Payment.countDocuments({ orderId: order._id })).toBe(0);

    // The order must be retryable, not stuck in PAYMENT_PROCESSING.
    const refreshedOrder = await Order.findById(order._id).lean();
    expect(refreshedOrder?.status).toBe("AWAITING_PAYMENT");
  });

  it("never deletes a proof belonging to a previously successful attempt when a later attempt's write fails", async () => {
    const { userId, cookieHeader } = await createTestSession();
    const order = await createTestOrder(userId);
    const method = await createTestPaymentMethod();

    // First submission succeeds normally.
    const firstForm = new FormData();
    firstForm.set("paymentMethodId", String(method._id));
    firstForm.set("transactionReference", "TXN-OK");
    firstForm.set("amountCents", "59800");
    firstForm.set("paymentDate", new Date().toISOString().slice(0, 10));
    firstForm.set("idempotencyKey", crypto.randomUUID());
    firstForm.set("proof", buildProofFile("kept.png"));

    const firstResponse = await submitPayment(
      new Request(`http://localhost:3000/api/orders/${order._id}/payments`, {
        method: "POST",
        headers: { cookie: cookieHeader },
        body: firstForm,
      }),
      { params: Promise.resolve({ orderId: String(order._id) }) },
    );
    const firstJson = (await firstResponse.json()) as { attemptId: string };
    const keptAttempt = await PaymentAttempt.findById(firstJson.attemptId).lean();
    expect(blobStore.has(keptAttempt!.proof.pathname)).toBe(true);

    // Move the order back to AWAITING_PAYMENT to allow a resubmission, then
    // force the *second* submission's write to fail.
    await Order.updateOne({ _id: order._id }, { status: "AWAITING_PAYMENT" });
    vi.spyOn(Payment, "findOneAndUpdate").mockRejectedValueOnce(new Error("simulated failure"));

    const secondForm = new FormData();
    secondForm.set("paymentMethodId", String(method._id));
    secondForm.set("transactionReference", "TXN-FAIL-2");
    secondForm.set("amountCents", "59800");
    secondForm.set("paymentDate", new Date().toISOString().slice(0, 10));
    secondForm.set("idempotencyKey", crypto.randomUUID());
    secondForm.set("proof", buildProofFile("orphaned.png"));

    await submitPayment(
      new Request(`http://localhost:3000/api/orders/${order._id}/payments`, {
        method: "POST",
        headers: { cookie: cookieHeader },
        body: secondForm,
      }),
      { params: Promise.resolve({ orderId: String(order._id) }) },
    );

    // The first attempt's proof survives; only the orphan from the failed
    // second attempt was deleted.
    expect(blobStore.has(keptAttempt!.proof.pathname)).toBe(true);
    expect(deletedPathnames).toHaveLength(1);
    expect(deletedPathnames[0]).not.toBe(keptAttempt!.proof.pathname);
  });
});
