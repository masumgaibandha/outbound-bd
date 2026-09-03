// Must be the first import — sets MONGODB_URI to an isolated in-memory
// instance before env.ts / mongoose.ts / the route are imported.
import { mongod } from "../helpers/mongodb-memory-server";

import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { NextRequest } from "next/server";

import { connectToDatabase } from "@/lib/mongoose";
import * as constants from "@/lib/masterclass/constants";
import {
  createDraftOrder,
  PAYMENT_ORDERS_COLLECTION,
} from "@/lib/masterclass/payment-orders-repository";
import {
  REGISTRATIONS_COLLECTION,
  upsertRegistration,
} from "@/lib/masterclass/registrations-repository";
import { COUNTERS_COLLECTION } from "@/lib/masterclass/counters-repository";
import { RATE_LIMIT_COLLECTION } from "@/lib/masterclass/rate-limit";
import { POST } from "@/app/api/masterclass/registrations/[publicOrderRef]/payment/route";

const ALLOWED_ORIGIN = "https://outboundbd.com";

async function seedDraftOrder() {
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
  return order.publicOrderRef;
}

function postRequest(publicOrderRef: string, body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`https://outboundbd.com/api/masterclass/registrations/${publicOrderRef}/payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: ALLOWED_ORIGIN,
      "sec-fetch-site": "same-origin",
      "x-forwarded-for": "203.0.113.7",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function callRoute(publicOrderRef: string, body: unknown, headers?: Record<string, string>) {
  return POST(postRequest(publicOrderRef, body, headers), {
    params: Promise.resolve({ publicOrderRef }),
  });
}

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    method: "BKASH",
    senderNumber: "01712345678",
    transactionId: `TXN-${randomUUID().slice(0, 8)}`,
    ...overrides,
  };
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
    db.collection(RATE_LIMIT_COLLECTION).deleteMany({}),
  ]);

  vi.unstubAllEnvs();
  vi.stubEnv("MASTERCLASS_REGISTRATION_ENABLED", "true");
  vi.stubEnv("TURNSTILE_SECRET_KEY", "not-a-cloudflare-test-key");
  vi.stubEnv("MASTERCLASS_RATE_LIMIT_SECRET", "test-secret");
  vi.stubEnv("MASTERCLASS_ALLOWED_ORIGINS", ALLOWED_ORIGIN);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("POST /api/masterclass/registrations/[publicOrderRef]/payment", () => {
  it("accepts a valid bKash submission and moves the order to REVIEW, never PAID", async () => {
    const publicOrderRef = await seedDraftOrder();
    const response = await callRoute(publicOrderRef, validPayload());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("REVIEW");
  });

  it("returns 404 for an order that doesn't exist", async () => {
    const response = await callRoute("ord_does-not-exist", validPayload());
    expect(response.status).toBe(404);
  });

  it("rejects a payment method outside bKash/Nagad/Rocket", async () => {
    const publicOrderRef = await seedDraftOrder();
    const response = await callRoute(publicOrderRef, validPayload({ method: "BANK_TRANSFER" }));
    expect(response.status).toBe(422);
  });

  it("rejects a disallowed origin", async () => {
    const publicOrderRef = await seedDraftOrder();
    const response = await callRoute(publicOrderRef, validPayload(), { Origin: "https://evil.example" });
    expect(response.status).toBe(403);
  });

  it("returns 503 when registration/payment isn't operationally ready", async () => {
    vi.stubEnv("MASTERCLASS_REGISTRATION_ENABLED", "false");
    const publicOrderRef = await seedDraftOrder();
    const response = await callRoute(publicOrderRef, validPayload());
    expect(response.status).toBe(503);
  });

  it("rejects a transaction ID already used on a different order (409)", async () => {
    const orderA = await seedDraftOrder();
    const orderB = await seedDraftOrder();
    const sharedTxnId = `TXN-${randomUUID().slice(0, 8)}`;

    const first = await callRoute(orderA, validPayload({ transactionId: sharedTxnId }));
    expect(first.status).toBe(200);

    const second = await callRoute(orderB, validPayload({ transactionId: sharedTxnId }));
    expect(second.status).toBe(409);
    const body = await second.json();
    expect(body.error).toBe("DUPLICATE_TRANSACTION_ID");
  });

  it("never marks an order PAID from this endpoint — client-submitted status/paid fields are ignored since the schema has none", async () => {
    const publicOrderRef = await seedDraftOrder();
    const response = await callRoute(
      publicOrderRef,
      // Deliberately probing that extra client-submitted fields can't force PAID —
      // `callRoute`'s `body` param is `unknown`, so no type error is expected here.
      { ...validPayload(), status: "PAID", paid: true },
    );
    const body = await response.json();
    expect(body.status).toBe("REVIEW"); // never PAID, regardless of what the client sent
  });
});
