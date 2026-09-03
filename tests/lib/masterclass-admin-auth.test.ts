// Must be the first import — sets MONGODB_URI to an isolated in-memory
// instance before env.ts / mongoose.ts / admin-auth.ts (which now rate-limits
// through Mongo, see below) are imported.
import { mongod } from "../helpers/mongodb-memory-server";

import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const headersMock = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({ headers: headersMock }));

import { connectToDatabase } from "@/lib/mongoose";
import { RATE_LIMIT_COLLECTION } from "@/lib/masterclass/rate-limit";
import { requireMasterclassAdmin, UnauthorizedAdminError } from "@/lib/masterclass/admin-auth";

function basicAuthHeader(user: string, password: string): string {
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

/**
 * `requireMasterclassAdmin()` now (as of the admin Server Actions port —
 * see admin-auth.ts's own doc comment) also calls `extractClientIp()` and
 * `checkRateLimit()` against the SAME header list before it even looks at
 * the Authorization header, so the mock must answer both `authorization`
 * and an IP header, not just the former.
 */
function mockRequestHeaders(authorization: string | null, ip = "203.0.113.50") {
  const map = new Map<string, string>();
  if (authorization !== null) map.set("authorization", authorization);
  map.set("x-forwarded-for", ip);
  headersMock.mockResolvedValue({ get: (key: string) => map.get(key.toLowerCase()) ?? null });
}

beforeAll(async () => {
  await connectToDatabase();
});

beforeEach(async () => {
  const connection = await connectToDatabase();
  await connection.connection.db?.collection(RATE_LIMIT_COLLECTION).deleteMany({});

  vi.unstubAllEnvs();
  vi.stubEnv("MASTERCLASS_ADMIN_USER", "admin");
  vi.stubEnv("MASTERCLASS_ADMIN_PASSWORD", "correct-horse-battery-staple");
  vi.stubEnv("MASTERCLASS_RATE_LIMIT_SECRET", "test-rate-limit-secret");
  vi.stubEnv("MASTERCLASS_ALLOWED_ORIGINS", "https://outboundbd.com");
});

afterEach(() => {
  vi.unstubAllEnvs();
  headersMock.mockReset();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("requireMasterclassAdmin", () => {
  it("resolves with the username on correct credentials", async () => {
    mockRequestHeaders(basicAuthHeader("admin", "correct-horse-battery-staple"));
    await expect(requireMasterclassAdmin()).resolves.toBe("admin");
  });

  it("rejects wrong credentials", async () => {
    mockRequestHeaders(basicAuthHeader("admin", "wrong-password"));
    await expect(requireMasterclassAdmin()).rejects.toThrow(UnauthorizedAdminError);
  });

  it("rejects a missing Authorization header", async () => {
    mockRequestHeaders(null);
    await expect(requireMasterclassAdmin()).rejects.toThrow(UnauthorizedAdminError);
  });

  it("rejects a non-Basic Authorization header", async () => {
    mockRequestHeaders("Bearer sometoken");
    await expect(requireMasterclassAdmin()).rejects.toThrow(UnauthorizedAdminError);
  });

  it("fails closed when the admin env vars are not configured, even with a correct-looking header", async () => {
    vi.unstubAllEnvs();
    mockRequestHeaders(basicAuthHeader("admin", "correct-horse-battery-staple"));
    await expect(requireMasterclassAdmin()).rejects.toThrow(UnauthorizedAdminError);
  });

  it("fails closed when the admin rate-limit/origin security env is incomplete, even with correct credentials", async () => {
    vi.stubEnv("MASTERCLASS_RATE_LIMIT_SECRET", "");
    mockRequestHeaders(basicAuthHeader("admin", "correct-horse-battery-staple"));
    await expect(requireMasterclassAdmin()).rejects.toThrow(UnauthorizedAdminError);
  });

  it("rate-limits repeated calls from the same IP (20/15min) — the 21st call is rejected even with correct credentials", async () => {
    const ip = "198.51.100.77";
    let lastError: unknown;
    for (let i = 0; i < 21; i++) {
      mockRequestHeaders(basicAuthHeader("admin", "correct-horse-battery-staple"), ip);
      try {
        await requireMasterclassAdmin();
      } catch (error) {
        lastError = error;
      }
    }
    expect(lastError).toBeInstanceOf(UnauthorizedAdminError);
  }, 30_000);

  it("does not rate-limit a different IP even after another IP is exhausted", async () => {
    const exhaustedIp = "198.51.100.88";
    for (let i = 0; i < 21; i++) {
      mockRequestHeaders(basicAuthHeader("admin", "correct-horse-battery-staple"), exhaustedIp);
      await requireMasterclassAdmin().catch(() => {});
    }
    mockRequestHeaders(basicAuthHeader("admin", "correct-horse-battery-staple"), "198.51.100.99");
    await expect(requireMasterclassAdmin()).resolves.toBe("admin");
  }, 30_000);
});
