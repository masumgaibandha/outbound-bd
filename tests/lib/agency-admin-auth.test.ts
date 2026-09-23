// Must be the first import — sets MONGODB_URI to an isolated in-memory
// instance before env.ts / mongoose.ts / admin-auth.ts (which rate-limits
// through Mongo) are imported.
import { mongod } from "../helpers/mongodb-memory-server";

import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const headersMock = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({ headers: headersMock }));

import { connectToDatabase } from "@/lib/mongoose";
import { RATE_LIMIT_COLLECTION } from "@/lib/masterclass/rate-limit";
import { requireAgencyAdmin, UnauthorizedAgencyAdminError } from "@/lib/agency-admin/admin-auth";

function basicAuthHeader(user: string, password: string): string {
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

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
  vi.stubEnv("AGENCY_ADMIN_USER", "agency-admin");
  vi.stubEnv("AGENCY_ADMIN_PASSWORD", "correct-horse-battery-staple");
  vi.stubEnv("AGENCY_ADMIN_RATE_LIMIT_SECRET", "test-agency-rate-limit-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
  headersMock.mockReset();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("requireAgencyAdmin", () => {
  it("resolves with the username on correct credentials", async () => {
    mockRequestHeaders(basicAuthHeader("agency-admin", "correct-horse-battery-staple"));
    await expect(requireAgencyAdmin()).resolves.toBe("agency-admin");
  });

  it("rejects wrong credentials", async () => {
    mockRequestHeaders(basicAuthHeader("agency-admin", "wrong-password"));
    await expect(requireAgencyAdmin()).rejects.toThrow(UnauthorizedAgencyAdminError);
  });

  it("rejects a missing Authorization header", async () => {
    mockRequestHeaders(null);
    await expect(requireAgencyAdmin()).rejects.toThrow(UnauthorizedAgencyAdminError);
  });

  it("rejects a non-Basic Authorization header", async () => {
    mockRequestHeaders("Bearer sometoken");
    await expect(requireAgencyAdmin()).rejects.toThrow(UnauthorizedAgencyAdminError);
  });

  it("fails closed when the admin env vars are not configured, even with a correct-looking header", async () => {
    vi.unstubAllEnvs();
    mockRequestHeaders(basicAuthHeader("agency-admin", "correct-horse-battery-staple"));
    await expect(requireAgencyAdmin()).rejects.toThrow(UnauthorizedAgencyAdminError);
  });

  it("fails closed when the rate-limit secret is missing, even with correct credentials", async () => {
    vi.stubEnv("AGENCY_ADMIN_RATE_LIMIT_SECRET", "");
    mockRequestHeaders(basicAuthHeader("agency-admin", "correct-horse-battery-staple"));
    await expect(requireAgencyAdmin()).rejects.toThrow(UnauthorizedAgencyAdminError);
  });

  it("rejects masterclass admin credentials — the two admin surfaces never share credentials", async () => {
    vi.stubEnv("MASTERCLASS_ADMIN_USER", "masterclass-admin");
    vi.stubEnv("MASTERCLASS_ADMIN_PASSWORD", "masterclass-password");
    mockRequestHeaders(basicAuthHeader("masterclass-admin", "masterclass-password"));
    await expect(requireAgencyAdmin()).rejects.toThrow(UnauthorizedAgencyAdminError);
  });

  it("rate-limits repeated calls from the same IP (20/15min) — the 21st call is rejected even with correct credentials", async () => {
    const ip = "198.51.100.77";
    let lastError: unknown;
    for (let i = 0; i < 21; i++) {
      mockRequestHeaders(basicAuthHeader("agency-admin", "correct-horse-battery-staple"), ip);
      try {
        await requireAgencyAdmin();
      } catch (error) {
        lastError = error;
      }
    }
    expect(lastError).toBeInstanceOf(UnauthorizedAgencyAdminError);
  }, 30_000);

  it("does not rate-limit a different IP even after another IP is exhausted", async () => {
    const exhaustedIp = "198.51.100.88";
    for (let i = 0; i < 21; i++) {
      mockRequestHeaders(basicAuthHeader("agency-admin", "correct-horse-battery-staple"), exhaustedIp);
      await requireAgencyAdmin().catch(() => {});
    }
    mockRequestHeaders(basicAuthHeader("agency-admin", "correct-horse-battery-staple"), "198.51.100.99");
    await expect(requireAgencyAdmin()).resolves.toBe("agency-admin");
  }, 30_000);

  it("does not share a rate-limit bucket with the masterclass admin auth (same IP, different scopes)", async () => {
    vi.stubEnv("MASTERCLASS_ADMIN_USER", "masterclass-admin");
    vi.stubEnv("MASTERCLASS_ADMIN_PASSWORD", "masterclass-password");
    vi.stubEnv("MASTERCLASS_RATE_LIMIT_SECRET", "test-masterclass-rate-limit-secret");
    vi.stubEnv("MASTERCLASS_ALLOWED_ORIGINS", "https://outboundbd.com");

    const { requireMasterclassAdmin } = await import("@/lib/masterclass/admin-auth");
    const ip = "198.51.100.150";

    for (let i = 0; i < 20; i++) {
      mockRequestHeaders(basicAuthHeader("masterclass-admin", "masterclass-password"), ip);
      await requireMasterclassAdmin();
    }

    mockRequestHeaders(basicAuthHeader("agency-admin", "correct-horse-battery-staple"), ip);
    await expect(requireAgencyAdmin()).resolves.toBe("agency-admin");
  }, 30_000);
});
