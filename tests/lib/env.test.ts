import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression coverage for the Preview-deployment build fix: `src/lib/env.ts`
 * (MONGODB_URI validation) used to run eagerly at module-import time, so
 * `mongoose.ts` — and transitively every route that touches the database,
 * agency and masterclass alike — crashed the *entire* Next.js build the
 * moment MONGODB_URI was unset in any environment that didn't happen to
 * have it configured (confirmed via an isolated local reproduction of the
 * feat/masterclass-migration Preview build). `getDatabaseEnv()` is now
 * validated lazily, only when actually called, matching the pattern
 * `src/lib/masterclass/env.ts` already used correctly. These tests prove
 * the fix without weakening the check itself: importing must never throw,
 * but calling `getDatabaseEnv()`/`connectToDatabase()` still fails loudly
 * and clearly when MONGODB_URI is genuinely missing.
 */

describe("src/lib/env.ts — lazy MONGODB_URI validation", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("importing the module never throws, even when MONGODB_URI is completely unset", async () => {
    vi.stubEnv("MONGODB_URI", undefined);
    await expect(import("@/lib/env")).resolves.toBeDefined();
  });

  it("importing mongoose.ts — the actual crash point in the Preview build — never throws just because MONGODB_URI is unset", async () => {
    vi.stubEnv("MONGODB_URI", undefined);
    await expect(import("@/lib/mongoose")).resolves.toBeDefined();
  });

  it("getDatabaseEnv() throws a clear error when called with MONGODB_URI missing", async () => {
    vi.stubEnv("MONGODB_URI", undefined);
    const { getDatabaseEnv } = await import("@/lib/env");
    expect(() => getDatabaseEnv()).toThrow(/Invalid database environment variables/);
  });

  it("getDatabaseEnv() returns the configured value when MONGODB_URI is present", async () => {
    vi.stubEnv("MONGODB_URI", "mongodb://127.0.0.1:27017/env-test-only");
    const { getDatabaseEnv } = await import("@/lib/env");
    expect(getDatabaseEnv().MONGODB_URI).toBe("mongodb://127.0.0.1:27017/env-test-only");
  });

  it("connectToDatabase() still rejects clearly at call time when MONGODB_URI is missing — the check is moved, not weakened", async () => {
    vi.stubEnv("MONGODB_URI", undefined);
    const { connectToDatabase } = await import("@/lib/mongoose");
    await expect(connectToDatabase()).rejects.toThrow(/Invalid database environment variables/);
  });
});
