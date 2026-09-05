import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getAdminAuthEnv,
  getManualPaymentEnv,
  getMetaCapiEnv,
  getSecurityEnv,
  isRegistrationEnabled,
  isRegistrationOperationallyReady,
  isUsingCloudflareTestKeys,
  listEnabledManualPaymentMethods,
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

const FULL_BANK_ENV = {
  MASTERCLASS_BANK_NAME: "Dutch-Bangla Bank",
  MASTERCLASS_BANK_ACCOUNT_NAME: "Outbound BD",
  MASTERCLASS_BANK_ACCOUNT_NUMBER: "1234567890123",
  MASTERCLASS_BANK_BRANCH: "Gulshan",
  MASTERCLASS_BANK_ROUTING_NUMBER: "090261234",
};

describe("getManualPaymentEnv", () => {
  it("enables only the methods whose number is actually configured", () => {
    vi.stubEnv("MASTERCLASS_BKASH_NUMBER", "01700000000");
    const env = getManualPaymentEnv();
    expect(env.bkash).toEqual({ enabled: true, number: "01700000000" });
    expect(env.nagad).toEqual({ enabled: false, number: null });
    expect(env.rocket).toEqual({ enabled: false, number: null });
  });

  it("bank: disabled and all fields null when none of the five bank variables are set", () => {
    const env = getManualPaymentEnv();
    expect(env.bank).toEqual({
      enabled: false,
      bankName: null,
      accountName: null,
      accountNumber: null,
      branch: null,
      routingNumber: null,
    });
  });

  it("bank: enabled with all five values only when every one of the five is set", () => {
    for (const [key, value] of Object.entries(FULL_BANK_ENV)) {
      vi.stubEnv(key, value);
    }
    const env = getManualPaymentEnv();
    expect(env.bank).toEqual({
      enabled: true,
      bankName: FULL_BANK_ENV.MASTERCLASS_BANK_NAME,
      accountName: FULL_BANK_ENV.MASTERCLASS_BANK_ACCOUNT_NAME,
      accountNumber: FULL_BANK_ENV.MASTERCLASS_BANK_ACCOUNT_NUMBER,
      branch: FULL_BANK_ENV.MASTERCLASS_BANK_BRANCH,
      routingNumber: FULL_BANK_ENV.MASTERCLASS_BANK_ROUTING_NUMBER,
    });
  });

  it.each(Object.keys(FULL_BANK_ENV))(
    "bank: missing just %s alone disables the whole bank option and reveals none of the other four values — never a half-shown bank",
    (missingKey) => {
      for (const [key, value] of Object.entries(FULL_BANK_ENV)) {
        if (key !== missingKey) vi.stubEnv(key, value);
      }
      const env = getManualPaymentEnv();
      expect(env.bank.enabled).toBe(false);
      expect(env.bank.bankName).toBeNull();
      expect(env.bank.accountName).toBeNull();
      expect(env.bank.accountNumber).toBeNull();
      expect(env.bank.branch).toBeNull();
      expect(env.bank.routingNumber).toBeNull();
    },
  );

  it("an incomplete bank configuration never disables bKash/Nagad/Rocket", () => {
    vi.stubEnv("MASTERCLASS_BKASH_NUMBER", "01700000000");
    vi.stubEnv("MASTERCLASS_NAGAD_NUMBER", "01700000001");
    vi.stubEnv("MASTERCLASS_ROCKET_NUMBER", "01700000002");
    vi.stubEnv("MASTERCLASS_BANK_NAME", "Dutch-Bangla Bank"); // only one of five — incomplete
    const env = getManualPaymentEnv();
    expect(env.bank.enabled).toBe(false);
    expect(env.bkash.enabled).toBe(true);
    expect(env.nagad.enabled).toBe(true);
    expect(env.rocket.enabled).toBe(true);
  });
});

describe("listEnabledManualPaymentMethods", () => {
  it("returns only the enabled methods, bank last", () => {
    const env = getManualPaymentEnv();
    expect(listEnabledManualPaymentMethods(env)).toEqual([]);

    vi.stubEnv("MASTERCLASS_BKASH_NUMBER", "01700000000");
    for (const [key, value] of Object.entries(FULL_BANK_ENV)) vi.stubEnv(key, value);
    expect(listEnabledManualPaymentMethods(getManualPaymentEnv())).toEqual(["BKASH", "BANK"]);
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
