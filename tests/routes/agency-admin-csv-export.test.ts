// Must be the first import — sets MONGODB_URI to an isolated in-memory
// instance before mongoose.ts / admin-auth.ts are imported.
import { mongod } from "../helpers/mongodb-memory-server";

import mongoose from "mongoose";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const headersMock = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({ headers: headersMock }));

import { connectToDatabase } from "@/lib/mongoose";
import { Inquiry } from "@/lib/models/inquiry";
import { RATE_LIMIT_COLLECTION } from "@/lib/masterclass/rate-limit";
import { GET } from "@/app/admin/leads/export/route";

const ADMIN_USER = "qa-agency-admin";
const ADMIN_PASSWORD = "qa-correct-horse-battery-staple";

function basicAuthHeader(user: string, password: string): string {
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

function mockHeaders(authorization: string | null) {
  const map = new Map<string, string>();
  if (authorization !== null) map.set("authorization", authorization);
  map.set("x-forwarded-for", "203.0.113.66");
  headersMock.mockResolvedValue({ get: (key: string) => map.get(key.toLowerCase()) ?? null });
}

function exportRequest(query = ""): Request {
  return new Request(`http://localhost:3000/admin/leads/export${query}`);
}

async function createLead(overrides: Partial<Record<string, unknown>> = {}) {
  return Inquiry.create({
    source: "contact",
    name: "Test Lead",
    email: "lead@example.com",
    website: "https://acme.example.com",
    budgetRange: "1k-plus",
    privacyConsent: true,
    status: "NEW",
    ...overrides,
  });
}

describe("GET /admin/leads/export", () => {
  beforeEach(async () => {
    const connection = await connectToDatabase();
    await connection.connection.db?.collection(RATE_LIMIT_COLLECTION).deleteMany({});
    await Inquiry.deleteMany({});

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

  it("rejects wrong credentials with 401", async () => {
    mockHeaders(basicAuthHeader(ADMIN_USER, "wrong-password"));
    const response = await GET(exportRequest());
    expect(response.status).toBe(401);
  });

  it("returns a UTF-8 BOM-prefixed CSV with the correct headers for correct credentials", async () => {
    mockHeaders(basicAuthHeader(ADMIN_USER, ADMIN_PASSWORD));
    await createLead();

    const response = await GET(exportRequest());
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect(response.headers.get("Content-Disposition")).toContain("attachment");

    // `Response.text()` decodes via `TextDecoder`, which strips a leading
    // BOM by default — inspect the raw bytes instead to actually prove it's
    // there on the wire (which is what Excel needs).
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder().decode(bytes)).toContain("Test Lead");
  });

  it("exports every filtered row, not just one page", async () => {
    mockHeaders(basicAuthHeader(ADMIN_USER, ADMIN_PASSWORD));
    for (let i = 0; i < 30; i++) {
      await createLead({ email: `lead-${i}@example.com` });
    }

    const response = await GET(exportRequest());
    const text = await response.text();
    const dataLines = text.split("\r\n").filter((line) => line.includes("@example.com"));
    expect(dataLines).toHaveLength(30);
  });

  it("applies the same filters as the leads list (status)", async () => {
    mockHeaders(basicAuthHeader(ADMIN_USER, ADMIN_PASSWORD));
    await createLead({ email: "won@example.com", status: "WON" });
    await createLead({ email: "new@example.com", status: "NEW" });

    const response = await GET(exportRequest("?status=WON"));
    const text = await response.text();
    expect(text).toContain("won@example.com");
    expect(text).not.toContain("new@example.com");
  });

  it("builds the filename from the date range", async () => {
    mockHeaders(basicAuthHeader(ADMIN_USER, ADMIN_PASSWORD));
    const response = await GET(exportRequest("?from=2026-09-01&to=2026-09-30"));
    expect(response.headers.get("Content-Disposition")).toContain(
      "outboundbd-leads-2026-09-01-to-2026-09-30.csv",
    );
  });
});
