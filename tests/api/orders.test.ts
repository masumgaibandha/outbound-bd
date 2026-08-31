import { describe, expect, it } from "vitest";

import { POST as createOrder } from "@/app/api/orders/route";
import { POST as cancelOrder } from "@/app/api/orders/[orderId]/cancel/route";
import { Order } from "@/lib/models/order";
import { createTestSession } from "../helpers/auth";
import { createTestOrder } from "../helpers/fixtures";

function createOrderRequest(cookieHeader: string, body: Record<string, unknown>) {
  return createOrder(
    new Request("http://localhost:3000/api/orders", {
      method: "POST",
      headers: { cookie: cookieHeader, "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/orders", () => {
  it("creates an order and is idempotent on retry with the same key", async () => {
    const { cookieHeader } = await createTestSession();
    const idempotencyKey = crypto.randomUUID();
    const body = {
      catalogId: "launch",
      company: "QA Co",
      website: "https://qa.example.test",
      country: "Bangladesh",
      idempotencyKey,
    };

    const first = await createOrderRequest(cookieHeader, body);
    expect(first.status).toBe(201);
    const firstJson = await first.json();

    const second = await createOrderRequest(cookieHeader, body);
    expect(second.status).toBe(200);
    const secondJson = await second.json();
    expect(secondJson.orderId).toBe(firstJson.orderId);

    expect(await Order.countDocuments({ idempotencyKey })).toBe(1);
  });

  it("401s when unauthenticated", async () => {
    const response = await createOrderRequest("", {
      catalogId: "launch",
      company: "QA Co",
      website: "https://qa.example.test",
      country: "Bangladesh",
      idempotencyKey: crypto.randomUUID(),
    });
    expect(response.status).toBe(401);
  });

  it("rejects an unknown catalog id without trusting client-supplied price/name", async () => {
    const { cookieHeader } = await createTestSession();
    const response = await createOrderRequest(cookieHeader, {
      catalogId: "not-a-real-catalog-item",
      company: "QA Co",
      website: "https://qa.example.test",
      country: "Bangladesh",
      idempotencyKey: crypto.randomUUID(),
    });
    expect(response.status).toBe(400);
  });
});

describe("POST /api/orders/[orderId]/cancel", () => {
  it("cancels the owner's own AWAITING_PAYMENT order", async () => {
    const { userId, cookieHeader } = await createTestSession();
    const order = await createTestOrder(userId);

    const response = await cancelOrder(
      new Request(`http://localhost:3000/api/orders/${order._id}/cancel`, {
        method: "POST",
        headers: { cookie: cookieHeader },
      }),
      { params: Promise.resolve({ orderId: String(order._id) }) },
    );
    expect(response.status).toBe(200);

    const updated = await Order.findById(order._id).lean();
    expect(updated?.status).toBe("CANCELLED");
  });

  it("404s when a different user tries to cancel it", async () => {
    const owner = await createTestSession();
    const stranger = await createTestSession();
    const order = await createTestOrder(owner.userId);

    const response = await cancelOrder(
      new Request(`http://localhost:3000/api/orders/${order._id}/cancel`, {
        method: "POST",
        headers: { cookie: stranger.cookieHeader },
      }),
      { params: Promise.resolve({ orderId: String(order._id) }) },
    );
    expect(response.status).toBe(404);

    const updated = await Order.findById(order._id).lean();
    expect(updated?.status).toBe("AWAITING_PAYMENT");
  });
});
