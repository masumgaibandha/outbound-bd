import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getAdminAuthEnv,
  getManualPaymentEnv,
  getMetaCapiEnv,
  getSecurityEnv,
  isRegistrationEnabled,
  isRegistrationOperationallyReady,
  isUsingCloudflareTestKeys,
  verifyMetaPixelIdsMatch,
} from "@/lib/masterclass/env";

const REAL_LOOKING_SECRET_KEY = "0x4AAAAAAA_real_looking_secret_key_value";
const REAL_LOOKING_SITE_KEY = "0x4AAAAAAA_real_looking_site_key_value";
const CLOUDFLARE_TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";
const CLOUDFLARE_TEST_SITE_KEY = "1x00000000000000000000AA";

function setSecurityEnv(overrides: Record<string, string | undefined> = {}) {
  const base: Record<string, string | undefined> = {
    TURNSTILE_SECRET_KEY: REAL_LOOKING_SECRET_KEY,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: REAL_LOOKING_SITE_KEY,
    MASTERCLASS_RATE_LIMIT_SECRET: "a-rotated-test-secret",
    MASTERCLASS_ALLOWED_ORIGINS: "https://outboundbd.com,https://www.outboundbd.com",
    MASTERCLASS_REGISTRATION_ENABLED: "true",
    ...overrides,
  };
  for (const [key, value] of Object.entries(base)) {
    if (value === undefined) vi.stubEnv(key, "");
    else vi.stubEnv(key, value);
  }
}

beforeEach(() => {
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isRegistrationEnabled", () => {
  it("is true only for the literal string 'true'", () => {
    vi.stubEnv("MASTERCLASS_REGISTRATION_ENABLED", "true");
    expect(isRegistrationEnabled()).toBe(true);
  });

  it("is false when unset, 'false', or any other value", () => {
    expect(isRegistrationEnabled()).toBe(false);
    vi.stubEnv("MASTERCLASS_REGISTRATION_ENABLED", "false");
    expect(isRegistrationEnabled()).toBe(false);
    vi.stubEnv("MASTERCLASS_REGISTRATION_ENABLED", "TRUE");
    expect(isRegistrationEnabled()).toBe(false);
    vi.stubEnv("MASTERCLASS_REGISTRATION_ENABLED", "1");
    expect(isRegistrationEnabled()).toBe(false);
  });
});

describe("getSecurityEnv", () => {
  it("returns null when any of turnstile secret / rate-limit secret / allowed origins is missing", () => {
    setSecurityEnv({ TURNSTILE_SECRET_KEY: undefined });
    expect(getSecurityEnv()).toBeNull();

    setSecurityEnv({ MASTERCLASS_RATE_LIMIT_SECRET: undefined });
    expect(getSecurityEnv()).toBeNull();

    setSecurityEnv({ MASTERCLASS_ALLOWED_ORIGINS: undefined });
    expect(getSecurityEnv()).toBeNull();

    setSecurityEnv({ MASTERCLASS_ALLOWED_ORIGINS: "   " });
    expect(getSecurityEnv()).toBeNull();
  });

  it("returns full config when everything is configured with real-looking keys", () => {
    setSecurityEnv();
    const env = getSecurityEnv();
    expect(env).not.toBeNull();
    expect(env?.turnstileSecretKey).toBe(REAL_LOOKING_SECRET_KEY);
    expect(env?.rateLimitSecret).toBe("a-rotated-test-secret");
    expect(env?.allowedOrigins).toEqual([
      "https://outboundbd.com",
      "https://www.outboundbd.com",
    ]);
  });

  it("rejects Cloudflare's official test secret key in production", () => {
    setSecurityEnv({ TURNSTILE_SECRET_KEY: CLOUDFLARE_TEST_SECRET_KEY });
    vi.stubEnv("NODE_ENV", "production");
    expect(getSecurityEnv()).toBeNull();
  });

  it("rejects Cloudflare's official test site key in production", () => {
    setSecurityEnv({ NEXT_PUBLIC_TURNSTILE_SITE_KEY: CLOUDFLARE_TEST_SITE_KEY });
    vi.stubEnv("NODE_ENV", "production");
    expect(getSecurityEnv()).toBeNull();
  });

  it("accepts real-looking keys in production", () => {
    setSecurityEnv();
    vi.stubEnv("NODE_ENV", "production");
    expect(getSecurityEnv()).not.toBeNull();
  });

  it("allows Cloudflare's official test keys outside production (local/automated testing)", () => {
    setSecurityEnv({
      TURNSTILE_SECRET_KEY: CLOUDFLARE_TEST_SECRET_KEY,
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: CLOUDFLARE_TEST_SITE_KEY,
    });
    vi.stubEnv("NODE_ENV", "test");
    expect(getSecurityEnv()).not.toBeNull();
  });
});

describe("isUsingCloudflareTestKeys", () => {
  it("is true when either the secret or site key matches a Cloudflare test value", () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", CLOUDFLARE_TEST_SECRET_KEY);
    expect(isUsingCloudflareTestKeys()).toBe(true);

    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", CLOUDFLARE_TEST_SITE_KEY);
    expect(isUsingCloudflareTestKeys()).toBe(true);
  });

  it("is false for real-looking keys", () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", REAL_LOOKING_SECRET_KEY);
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", REAL_LOOKING_SITE_KEY);
    expect(isUsingCloudflareTestKeys()).toBe(false);
  });
});

describe("getManualPaymentEnv", () => {
  it("enables only the methods whose number is actually configured", () => {
    vi.stubEnv("MASTERCLASS_BKASH_NUMBER", "01700000000");
    const env = getManualPaymentEnv();
    expect(env.bkash).toEqual({ enabled: true, number: "01700000000" });
    expect(env.nagad).toEqual({ enabled: false, number: null });
    expect(env.rocket).toEqual({ enabled: false, number: null });
  });
});

describe("getAdminAuthEnv", () => {
  it("returns null if either credential is missing", () => {
    vi.stubEnv("MASTERCLASS_ADMIN_USER", "admin");
    expect(getAdminAuthEnv()).toBeNull();
  });

  it("returns both credentials when fully configured", () => {
    vi.stubEnv("MASTERCLASS_ADMIN_USER", "admin");
    vi.stubEnv("MASTERCLASS_ADMIN_PASSWORD", "hunter2");
    expect(getAdminAuthEnv()).toEqual({ username: "admin", password: "hunter2" });
  });
});

describe("getMetaCapiEnv", () => {
  it("returns null if either half is missing", () => {
    vi.stubEnv("META_PIXEL_ID", "123");
    expect(getMetaCapiEnv()).toBeNull();
  });

  it("returns both when fully configured", () => {
    vi.stubEnv("META_PIXEL_ID", "123");
    vi.stubEnv("META_CAPI_ACCESS_TOKEN", "token");
    expect(getMetaCapiEnv()).toEqual({ pixelId: "123", capiAccessToken: "token" });
  });
});

describe("verifyMetaPixelIdsMatch", () => {
  it("is true when either side is absent (nothing to mismatch)", () => {
    expect(verifyMetaPixelIdsMatch()).toBe(true);
  });

  it("is true when both sides match", () => {
    vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", "123");
    vi.stubEnv("META_PIXEL_ID", "123");
    expect(verifyMetaPixelIdsMatch()).toBe(true);
  });

  it("is false when they mismatch", () => {
    vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", "123");
    vi.stubEnv("META_PIXEL_ID", "456");
    expect(verifyMetaPixelIdsMatch()).toBe(false);
  });
});

describe("isRegistrationOperationallyReady", () => {
  it("is true only when the feature flag, privacy policy, and full security config all hold", () => {
    setSecurityEnv();
    expect(isRegistrationOperationallyReady()).toBe(true);
  });

  it("is false when the feature flag is off even with full security config", () => {
    setSecurityEnv({ MASTERCLASS_REGISTRATION_ENABLED: "false" });
    expect(isRegistrationOperationallyReady()).toBe(false);
  });

  it("is false when security config is incomplete even with the flag on", () => {
    setSecurityEnv({ TURNSTILE_SECRET_KEY: undefined });
    expect(isRegistrationOperationallyReady()).toBe(false);
  });
});
