import "../helpers/test-public-env";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SHOW_MASTERCLASS_BANNER } from "@/components/public/site-config";

// The sales-page layout loads Hind Siliguri through next/font/google, which
// only works under Next's own compiler. Only its metadata matters here.
vi.mock("next/font/google", () => ({
  Hind_Siliguri: () => ({ className: "", variable: "" }),
}));

// SHOW_MASTERCLASS_BANNER controls only the agency-site banner. Everything
// else MASTERCLASS_REGISTRATION_ENABLED drives (sitemap, indexing, the
// registration gate) must keep following that env var alone.
const MASTERCLASS_PATH = "/masterclass/lead-generation-cold-email";

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("SHOW_MASTERCLASS_BANNER", () => {
  it("is off, so the banner does not render on the agency site", () => {
    expect(SHOW_MASTERCLASS_BANNER).toBe(false);
  });
});

describe("MASTERCLASS_REGISTRATION_ENABLED is unaffected by the banner switch", () => {
  it("still adds the masterclass page to the sitemap when registration is on", async () => {
    vi.stubEnv("MASTERCLASS_REGISTRATION_ENABLED", "true");
    const { default: sitemap } = await import("@/app/sitemap");
    expect(sitemap().some((entry) => entry.url.endsWith(MASTERCLASS_PATH))).toBe(true);
  });

  it("still leaves the masterclass page out of the sitemap when registration is off", async () => {
    vi.stubEnv("MASTERCLASS_REGISTRATION_ENABLED", "false");
    const { default: sitemap } = await import("@/app/sitemap");
    expect(sitemap().some((entry) => entry.url.endsWith(MASTERCLASS_PATH))).toBe(false);
  });

  it("still makes the sales page indexable when registration is on", async () => {
    vi.stubEnv("MASTERCLASS_REGISTRATION_ENABLED", "true");
    const { metadata } = await import("@/app/masterclass/lead-generation-cold-email/layout");
    expect(metadata.robots).toEqual({ index: true, follow: true });
  });

  it("still keeps the sales page unindexed when registration is off", async () => {
    vi.stubEnv("MASTERCLASS_REGISTRATION_ENABLED", "false");
    const { metadata } = await import("@/app/masterclass/lead-generation-cold-email/layout");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("still reports registration enabled from the env var alone", async () => {
    vi.stubEnv("MASTERCLASS_REGISTRATION_ENABLED", "true");
    const { isRegistrationEnabled } = await import("@/lib/masterclass/env");
    expect(isRegistrationEnabled()).toBe(true);
  });
});
