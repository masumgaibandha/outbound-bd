import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getAllowedTurnstileHostnames, validateTurnstileToken } from "@/lib/masterclass/turnstile";

const CLOUDFLARE_TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";
const CLOUDFLARE_TEST_SITE_KEY = "1x00000000000000000000AA";
const REAL_LOOKING_SECRET_KEY = "0x4AAAAAAA_real_looking_secret_key_value";
const REAL_LOOKING_SITE_KEY = "0x4AAAAAAA_real_looking_site_key_value";

/*
 * Regression coverage for a bug the full isolated E2E workflow caught (not
 * any prior mocked-fetch unit test, since those never exercised Cloudflare's
 * real Siteverify endpoint): Cloudflare's official test keypair's real
 * Siteverify response never echoes back an `action`, and always reports
 * `hostname: "example.com"` regardless of the page's real origin — both of
 * which the original hostname/action checks rejected outright, meaning no
 * local or automated test using the official test keys could ever
 * successfully register, contradicting the task's own explicit allowance
 * for using them locally.
 */
describe("getAllowedTurnstileHostnames", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not include example.com in production, even with test keys configured", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TURNSTILE_SECRET_KEY", CLOUDFLARE_TEST_SECRET_KEY);
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", CLOUDFLARE_TEST_SITE_KEY);
    expect(getAllowedTurnstileHostnames()).toEqual(["outboundbd.com", "www.outboundbd.com"]);
  });

  it("does not include example.com in non-production with real-looking keys", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TURNSTILE_SECRET_KEY", REAL_LOOKING_SECRET_KEY);
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", REAL_LOOKING_SITE_KEY);
    expect(getAllowedTurnstileHostnames()).toEqual(["outboundbd.com", "www.outboundbd.com", "localhost"]);
  });

  it("includes example.com only in non-production with the official test keys", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TURNSTILE_SECRET_KEY", CLOUDFLARE_TEST_SECRET_KEY);
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", CLOUDFLARE_TEST_SITE_KEY);
    expect(getAllowedTurnstileHostnames()).toEqual(["outboundbd.com", "www.outboundbd.com", "localhost", "example.com"]);
  });
});

function mockSiteverify(response: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => response }),
  );
}

describe("validateTurnstileToken — Cloudflare test-key response shape", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("accepts a test-key response with no action field and hostname example.com, in non-production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TURNSTILE_SECRET_KEY", CLOUDFLARE_TEST_SECRET_KEY);
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", CLOUDFLARE_TEST_SITE_KEY);
    mockSiteverify({ success: true, "error-codes": [], hostname: "example.com" });

    const result = await validateTurnstileToken({
      token: "any-test-token",
      remoteIp: null,
      secretKey: CLOUDFLARE_TEST_SECRET_KEY,
      allowedHostnames: getAllowedTurnstileHostnames(),
    });

    expect(result).toEqual({ ok: true });
  });

  it("still rejects a real-key response missing a matching action", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TURNSTILE_SECRET_KEY", REAL_LOOKING_SECRET_KEY);
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", REAL_LOOKING_SITE_KEY);
    mockSiteverify({ success: true, hostname: "outboundbd.com" }); // no action field

    const result = await validateTurnstileToken({
      token: "any-real-token",
      remoteIp: null,
      secretKey: REAL_LOOKING_SECRET_KEY,
      allowedHostnames: getAllowedTurnstileHostnames(),
    });

    expect(result).toEqual({ ok: false, reason: "BOT_VERIFICATION_FAILED" });
  });

  it("still rejects a real-key response with an untrusted hostname", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TURNSTILE_SECRET_KEY", REAL_LOOKING_SECRET_KEY);
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", REAL_LOOKING_SITE_KEY);
    mockSiteverify({ success: true, action: "masterclass_registration", hostname: "example.com" });

    const result = await validateTurnstileToken({
      token: "any-real-token",
      remoteIp: null,
      secretKey: REAL_LOOKING_SECRET_KEY,
      allowedHostnames: getAllowedTurnstileHostnames(),
    });

    expect(result).toEqual({ ok: false, reason: "BOT_VERIFICATION_FAILED" });
  });
});
