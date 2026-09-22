import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getAgencyMetaCapiEnv } from "@/lib/tracking/env";

beforeEach(() => {
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getAgencyMetaCapiEnv", () => {
  it("returns null when both AGENCY_META_PIXEL_ID and AGENCY_META_CAPI_ACCESS_TOKEN are unset", () => {
    expect(getAgencyMetaCapiEnv()).toBeNull();
  });

  it("returns null when only the pixel ID is set", () => {
    vi.stubEnv("AGENCY_META_PIXEL_ID", "123456");
    expect(getAgencyMetaCapiEnv()).toBeNull();
  });

  it("returns null when only the access token is set", () => {
    vi.stubEnv("AGENCY_META_CAPI_ACCESS_TOKEN", "test-token");
    expect(getAgencyMetaCapiEnv()).toBeNull();
  });

  it("returns both values when both are set", () => {
    vi.stubEnv("AGENCY_META_PIXEL_ID", "123456");
    vi.stubEnv("AGENCY_META_CAPI_ACCESS_TOKEN", "test-token");
    expect(getAgencyMetaCapiEnv()).toEqual({ pixelId: "123456", capiAccessToken: "test-token" });
  });

  it("importing this module never throws even with nothing configured", async () => {
    await expect(import("@/lib/tracking/env")).resolves.toBeTruthy();
  });
});
