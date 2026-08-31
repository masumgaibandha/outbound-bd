import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/blob-storage", () => import("../fakes/blob-storage-fake"));

import { POST as submitPayment } from "@/app/api/orders/[orderId]/payments/route";
import { GET as getCurrentProof } from "@/app/api/payments/[paymentId]/proof/route";
import { GET as getAttemptProof } from "@/app/api/payments/[paymentId]/attempts/[attemptId]/proof/route";
import { createTestSession } from "../helpers/auth";
import { buildProofFile, createTestOrder, createTestPaymentMethod } from "../helpers/fixtures";
import { resetBlobFake } from "../fakes/blob-storage-fake";

async function submit(userId: string, cookieHeader: string) {
  const order = await createTestOrder(userId);
  const method = await createTestPaymentMethod();
  const formData = new FormData();
  formData.set("paymentMethodId", String(method._id));
  formData.set("transactionReference", "TXN");
  formData.set("amountCents", "59800");
  formData.set("paymentDate", new Date().toISOString().slice(0, 10));
  formData.set("idempotencyKey", crypto.randomUUID());
  formData.set("proof", buildProofFile("secret-proof.png"));

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

describe("payment proof access control", () => {
  afterEach(() => {
    resetBlobFake();
  });

  it("lets the owning client read the current proof", async () => {
    const client = await createTestSession();
    const { paymentId } = await submit(client.userId, client.cookieHeader);

    const response = await getCurrentProof(
      new Request(`http://localhost:3000/api/payments/${paymentId}/proof`, {
        headers: { cookie: client.cookieHeader },
      }),
      { params: Promise.resolve({ paymentId }) },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("lets an admin read another user's proof", async () => {
    const client = await createTestSession();
    const admin = await createTestSession({ role: "ADMIN" });
    const { paymentId } = await submit(client.userId, client.cookieHeader);

    const response = await getCurrentProof(
      new Request(`http://localhost:3000/api/payments/${paymentId}/proof`, {
        headers: { cookie: admin.cookieHeader },
      }),
      { params: Promise.resolve({ paymentId }) },
    );
    expect(response.status).toBe(200);
  });

  it("404s for a different (non-owner, non-admin) client", async () => {
    const client = await createTestSession();
    const stranger = await createTestSession();
    const { paymentId } = await submit(client.userId, client.cookieHeader);

    const response = await getCurrentProof(
      new Request(`http://localhost:3000/api/payments/${paymentId}/proof`, {
        headers: { cookie: stranger.cookieHeader },
      }),
      { params: Promise.resolve({ paymentId }) },
    );
    expect(response.status).toBe(404);
  });

  it("401s for an unauthenticated request", async () => {
    const client = await createTestSession();
    const { paymentId } = await submit(client.userId, client.cookieHeader);

    const response = await getCurrentProof(
      new Request(`http://localhost:3000/api/payments/${paymentId}/proof`),
      { params: Promise.resolve({ paymentId }) },
    );
    expect(response.status).toBe(401);
  });

  it("serves a specific historical attempt's proof to its owner, gated the same way", async () => {
    const client = await createTestSession();
    const stranger = await createTestSession();
    const { paymentId, attemptId } = await submit(client.userId, client.cookieHeader);

    const ownerResponse = await getAttemptProof(
      new Request(`http://localhost:3000/api/payments/${paymentId}/attempts/${attemptId}/proof`, {
        headers: { cookie: client.cookieHeader },
      }),
      { params: Promise.resolve({ paymentId, attemptId }) },
    );
    expect(ownerResponse.status).toBe(200);

    const strangerResponse = await getAttemptProof(
      new Request(`http://localhost:3000/api/payments/${paymentId}/attempts/${attemptId}/proof`, {
        headers: { cookie: stranger.cookieHeader },
      }),
      { params: Promise.resolve({ paymentId, attemptId }) },
    );
    expect(strangerResponse.status).toBe(404);
  });

  it("streams the proof file directly rather than returning a JSON body with a fetchable URL", async () => {
    const client = await createTestSession();
    const { paymentId } = await submit(client.userId, client.cookieHeader);

    const response = await getCurrentProof(
      new Request(`http://localhost:3000/api/payments/${paymentId}/proof`, {
        headers: { cookie: client.cookieHeader },
      }),
      { params: Promise.resolve({ paymentId }) },
    );
    expect(response.headers.get("content-type")).not.toContain("application/json");
    expect(response.headers.get("content-type")).toBe("image/png");
  });
});
