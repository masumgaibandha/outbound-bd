// Must be the first import — starts a single-node replica set (transaction
// support, since the route ultimately calls registerForMasterclass) and
// sets MONGODB_URI before env.ts / mongoose.ts / the route are imported.
import { mongod } from "../helpers/mongodb-memory-replset";

import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { NextRequest } from "next/server";

import { connectToDatabase } from "@/lib/mongoose";
import { PAYMENT_ORDERS_COLLECTION } from "@/lib/masterclass/payment-orders-repository";
import { REGISTRATIONS_COLLECTION } from "@/lib/masterclass/registrations-repository";
import { COUNTERS_COLLECTION } from "@/lib/masterclass/counters-repository";
import { RATE_LIMIT_COLLECTION } from "@/lib/masterclass/rate-limit";
import { POST } from "@/app/api/masterclass/registrations/route";

const ALLOWED_ORIGIN = "https://outboundbd.com";

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Rafiq Islam",
    email: `rafiq-${randomUUID()}@example.com`,
    phone: "01712345678",
    termsAccepted: true,
    marketingConsent: false,
    turnstileToken: "any-token",
    honeypot: "",
    startedAt: Date.now() - 5000,
    ...overrides,
  };
}

function postRequest(
  body: unknown,
  { headers = {}, idempotencyKey = randomUUID() }: { headers?: Record<string, string>; idempotencyKey?: string | null } = {},
) {
  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Origin: ALLOWED_ORIGIN,
    "sec-fetch-site": "same-origin",
    "x-forwarded-for": "203.0.113.7",
    ...headers,
  };
  if (idempotencyKey !== null) finalHeaders["Idempotency-Key"] = idempotencyKey;
  return new NextRequest("https://outboundbd.com/api/masterclass/registrations", {
    method: "POST",
    headers: finalHeaders,
    body: JSON.stringify(body),
  });
}

function mockTurnstileSuccess() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, action: "masterclass_registration", hostname: "outboundbd.com" }),
    }),
  );
}

function mockTurnstileFailure() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: false }),
    }),
  );
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
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "not-a-cloudflare-test-key-either");
  vi.stubEnv("MASTERCLASS_RATE_LIMIT_SECRET", "test-secret");
  vi.stubEnv("MASTERCLASS_ALLOWED_ORIGINS", ALLOWED_ORIGIN);
  mockTurnstileSuccess();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("POST /api/masterclass/registrations", () => {
  it("registers a valid submission and persists it", async () => {
    const response = await POST(postRequest(validPayload()));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.publicRegistrationRef).toMatch(/^MC-\d{4}-\d{6}$/);
    expect(body.status).toBe("PENDING");
  });

  it("returns 503 REGISTRATION_NOT_OPEN when the feature flag is off", async () => {
    vi.stubEnv("MASTERCLASS_REGISTRATION_ENABLED", "false");
    const response = await POST(postRequest(validPayload()));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toBe("REGISTRATION_NOT_OPEN");
  });

  it("rejects a disallowed origin", async () => {
    const response = await POST(postRequest(validPayload(), { headers: { Origin: "https://evil.example" } }));
    expect(response.status).toBe(403);
  });

  it("rejects a missing/invalid Idempotency-Key header", async () => {
    const response = await POST(postRequest(validPayload(), { idempotencyKey: "not-a-uuid" }));
    expect(response.status).toBe(400);
  });

  it("rejects a submission missing a required field", async () => {
    const payload = validPayload();
    delete (payload as Record<string, unknown>).name;
    const response = await POST(postRequest(payload));
    expect(response.status).toBe(422);
  });

  it("silently fake-succeeds a honeypot-tripped submission without persisting", async () => {
    const response = await POST(postRequest(validPayload({ honeypot: "http://spam.example" })));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.publicRegistrationRef).toBe("");

    const connection = await connectToDatabase();
    const count = await connection.connection.db!.collection(REGISTRATIONS_COLLECTION).countDocuments({});
    expect(count).toBe(0);
  });

  it("silently fake-succeeds a too-fast submission without persisting", async () => {
    const response = await POST(postRequest(validPayload({ startedAt: Date.now() })));
    expect(response.status).toBe(201);
    const connection = await connectToDatabase();
    const count = await connection.connection.db!.collection(REGISTRATIONS_COLLECTION).countDocuments({});
    expect(count).toBe(0);
  });

  it("rejects a failed Turnstile verification", async () => {
    mockTurnstileFailure();
    const response = await POST(postRequest(validPayload()));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("BOT_VERIFICATION_FAILED");
  });

  it("rejects when Turnstile Siteverify is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const response = await POST(postRequest(validPayload()));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toBe("VERIFICATION_UNAVAILABLE");
  });

  it("production rejects Cloudflare's official test Turnstile keys with the generic REGISTRATION_NOT_OPEN response", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA");
    const response = await POST(postRequest(validPayload()));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toBe("REGISTRATION_NOT_OPEN");
  });

  it("same Idempotency-Key submitted twice returns the same registration, not a duplicate", async () => {
    const idempotencyKey = randomUUID();
    const payload = validPayload();

    const first = await POST(postRequest(payload, { idempotencyKey }));
    const second = await POST(postRequest(payload, { idempotencyKey }));
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const firstBody = await first.json();
    const secondBody = await second.json();
    expect(secondBody.publicOrderRef).toBe(firstBody.publicOrderRef);

    const connection = await connectToDatabase();
    const count = await connection.connection.db!.collection(PAYMENT_ORDERS_COLLECTION).countDocuments({});
    expect(count).toBe(1);
  });

  it("same email/phone with a DIFFERENT Idempotency-Key reuses the existing active order instead of opening a second one", async () => {
    const payload = validPayload();

    const first = await POST(postRequest(payload));
    const second = await POST(postRequest(payload, { idempotencyKey: randomUUID() }));
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const firstBody = await first.json();
    const secondBody = await second.json();
    expect(secondBody.publicRegistrationRef).toBe(firstBody.publicRegistrationRef);
    expect(secondBody.publicOrderRef).toBe(firstBody.publicOrderRef); // reused, not a second PENDING order
    expect(secondBody.status).toBe("PENDING");

    const connection = await connectToDatabase();
    const count = await connection.connection.db!.collection(PAYMENT_ORDERS_COLLECTION).countDocuments({});
    expect(count).toBe(1);
  });

  it("genuinely concurrent submissions for the same student never create more than one active order", async () => {
    const payload = validPayload();

    const responses = await Promise.all(
      Array.from({ length: 4 }, () => POST(postRequest(payload, { idempotencyKey: randomUUID() }))),
    );
    expect(responses.every((r) => r.status === 201)).toBe(true);
    const bodies = await Promise.all(responses.map((r) => r.json()));
    const orderRefs = new Set(bodies.map((b) => b.publicOrderRef));
    expect(orderRefs.size).toBe(1); // every concurrent caller converged on the same single order

    const connection = await connectToDatabase();
    const count = await connection.connection.db!.collection(PAYMENT_ORDERS_COLLECTION).countDocuments({});
    expect(count).toBe(1);
  }, 30_000);

  it("enforces the IP rate limit (30/10min) — the 31st request from the same IP within the window is blocked", async () => {
    const ip = "198.51.100.42";
    let lastStatus = 0;
    for (let i = 0; i < 31; i++) {
      const response = await POST(
        postRequest(validPayload(), { headers: { "x-forwarded-for": ip }, idempotencyKey: randomUUID() }),
      );
      lastStatus = response.status;
    }
    expect(lastStatus).toBe(429);
  }, 30_000);
});
