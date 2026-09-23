// Must be the first import — sets MONGODB_URI to an isolated in-memory
// instance before mongoose.ts / admin-auth.ts are imported.
import { mongod } from "../helpers/mongodb-memory-server";

import mongoose from "mongoose";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const headersMock = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({ headers: headersMock }));

import { connectToDatabase } from "@/lib/mongoose";
import { Client } from "@/lib/models/client";
import { Payment } from "@/lib/models/payment";
import { RATE_LIMIT_COLLECTION } from "@/lib/masterclass/rate-limit";
import { GET } from "@/app/admin/payments/export/route";

const ADMIN_USER = "qa-agency-admin";
const ADMIN_PASSWORD = "qa-correct-horse-battery-staple";

function basicAuthHeader(user: string, password: string): string {
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

function mockHeaders(authorization: string | null) {
  const map = new Map<string, string>();
  if (authorization !== null) map.set("authorization", authorization);
  map.set("x-forwarded-for", "203.0.113.68");
  headersMock.mockResolvedValue({ get: (key: string) => map.get(key.toLowerCase()) ?? null });
}

function exportRequest(query = ""): Request {
  return new Request(`http://localhost:3000/admin/payments/export${query}`);
}

async function createTestClient() {
  return Client.create({
    name: "Alex Founder",
    company: "Acme Inc",
    email: "alex@acme.com",
    website: "https://acme.com",
    plan: "LAUNCH",
    monthlyAmountCents: 49900,
    currency: "USD",
    billingDayOfMonth: 1,
    startDate: new Date("2026-09-01"),
    status: "ACTIVE",
  });
}

describe("GET /admin/payments/export", () => {
  beforeEach(async () => {
    const connection = await connectToDatabase();
    await connection.connection.db?.collection(RATE_LIMIT_COLLECTION).deleteMany({});
    await Promise.all([Payment.deleteMany({}), Client.deleteMany({})]);

    vi.unstubAllEnvs();
    vi.stubEnv("AGENCY_ADMIN_USER", ADMIN_USER);
    vi.stubEnv("AGENCY_ADMIN_PASSWORD", ADMIN_PASSWORD);
    vi.stubEnv("AGENCY_ADMIN_RATE_LIMIT_SECRET", "qa-agency-rate-limit-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    headersMock.mockReset();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  it("rejects an unauthenticated request with 401", async () => {
    mockHeaders(null);
    const response = await GET(exportRequest());
    expect(response.status).toBe(401);
  });

  it("returns a UTF-8 BOM-prefixed CSV for correct credentials", async () => {
    mockHeaders(basicAuthHeader(ADMIN_USER, ADMIN_PASSWORD));
    const client = await createTestClient();
    await Payment.create({
      clientId: client._id,
      amountCents: 49900,
      currency: "USD",
      paidAt: new Date("2026-09-15"),
      method: "WISE",
      type: "MONTHLY",
    });

    const response = await GET(exportRequest());
    expect(response.status).toBe(200);

    const bytes = new Uint8Array(await response.arrayBuffer());
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder().decode(bytes)).toContain("Acme Inc");
  });

  it("applies the same filters as the payments list (method)", async () => {
    mockHeaders(basicAuthHeader(ADMIN_USER, ADMIN_PASSWORD));
    const client = await createTestClient();
    await Payment.create({
      clientId: client._id,
      amountCents: 19900,
      currency: "USD",
      paidAt: new Date("2026-09-01"),
      method: "STRIPE",
      type: "SETUP",
      reference: "stripe-ref",
    });
    await Payment.create({
      clientId: client._id,
      amountCents: 49900,
      currency: "USD",
      paidAt: new Date("2026-09-15"),
      method: "WISE",
      type: "MONTHLY",
      reference: "wise-ref",
    });

    const response = await GET(exportRequest("?method=STRIPE"));
    const text = await response.text();
    expect(text).toContain("stripe-ref");
    expect(text).not.toContain("wise-ref");
  });

  it("builds the filename from the date range", async () => {
    mockHeaders(basicAuthHeader(ADMIN_USER, ADMIN_PASSWORD));
    const response = await GET(exportRequest("?from=2026-09-01&to=2026-09-30"));
    expect(response.headers.get("Content-Disposition")).toContain(
      "outboundbd-payments-2026-09-01-to-2026-09-30.csv",
    );
  });
});
