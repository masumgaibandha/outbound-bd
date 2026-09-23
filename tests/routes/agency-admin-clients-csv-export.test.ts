// Must be the first import — sets MONGODB_URI to an isolated in-memory
// instance before mongoose.ts / admin-auth.ts are imported.
import { mongod } from "../helpers/mongodb-memory-server";

import mongoose from "mongoose";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const headersMock = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({ headers: headersMock }));

import { connectToDatabase } from "@/lib/mongoose";
import { Client } from "@/lib/models/client";
import { RATE_LIMIT_COLLECTION } from "@/lib/masterclass/rate-limit";
import { GET } from "@/app/admin/clients/export/route";

const ADMIN_USER = "qa-agency-admin";
const ADMIN_PASSWORD = "qa-correct-horse-battery-staple";

function basicAuthHeader(user: string, password: string): string {
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

function mockHeaders(authorization: string | null) {
  const map = new Map<string, string>();
  if (authorization !== null) map.set("authorization", authorization);
  map.set("x-forwarded-for", "203.0.113.67");
  headersMock.mockResolvedValue({ get: (key: string) => map.get(key.toLowerCase()) ?? null });
}

function exportRequest(query = ""): Request {
  return new Request(`http://localhost:3000/admin/clients/export${query}`);
}

async function createClient(overrides: Partial<Record<string, unknown>> = {}) {
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
    ...overrides,
  });
}

describe("GET /admin/clients/export", () => {
  beforeEach(async () => {
    const connection = await connectToDatabase();
    await connection.connection.db?.collection(RATE_LIMIT_COLLECTION).deleteMany({});
    await Client.deleteMany({});

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
    await createClient();

    const response = await GET(exportRequest());
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");

    const bytes = new Uint8Array(await response.arrayBuffer());
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder().decode(bytes)).toContain("Acme Inc");
  });

  it("applies the same filters as the clients list (status)", async () => {
    mockHeaders(basicAuthHeader(ADMIN_USER, ADMIN_PASSWORD));
    await createClient({ email: "active@example.com", company: "Active Co", status: "ACTIVE" });
    await createClient({ email: "paused@example.com", company: "Paused Co", status: "PAUSED" });

    const response = await GET(exportRequest("?status=PAUSED"));
    const text = await response.text();
    expect(text).toContain("Paused Co");
    expect(text).not.toContain("Active Co");
  });

  it("uses the fixed 'clients' filename", async () => {
    mockHeaders(basicAuthHeader(ADMIN_USER, ADMIN_PASSWORD));
    const response = await GET(exportRequest());
    expect(response.headers.get("Content-Disposition")).toContain("outboundbd-clients-all-to-all.csv");
  });
});
