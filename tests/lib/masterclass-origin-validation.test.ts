import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isRequestSameOrigin } from "@/lib/masterclass/origin-validation";

const ALLOWED = ["https://outboundbd.com", "https://www.outboundbd.com", "http://localhost:3000"];

function headersWith(origin: string | null, secFetchSite?: string): Headers {
  const headers = new Headers();
  if (origin !== null) headers.set("origin", origin);
  if (secFetchSite) headers.set("sec-fetch-site", secFetchSite);
  return headers;
}

beforeEach(() => {
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isRequestSameOrigin", () => {
  it("accepts an allowed origin", () => {
    expect(isRequestSameOrigin(headersWith("https://outboundbd.com"), ALLOWED)).toBe(true);
  });

  it("rejects a disallowed origin", () => {
    expect(isRequestSameOrigin(headersWith("https://evil.example"), ALLOWED)).toBe(false);
  });

  it("rejects a missing or 'null' origin header", () => {
    expect(isRequestSameOrigin(headersWith(null), ALLOWED)).toBe(false);
    expect(isRequestSameOrigin(headersWith("null"), ALLOWED)).toBe(false);
  });

  it("rejects a cross-site sec-fetch-site value even for an allowed origin", () => {
    expect(
      isRequestSameOrigin(headersWith("https://outboundbd.com", "cross-site"), ALLOWED),
    ).toBe(false);
  });

  it("accepts same-origin/same-site sec-fetch-site values", () => {
    expect(isRequestSameOrigin(headersWith("https://outboundbd.com", "same-origin"), ALLOWED)).toBe(
      true,
    );
    expect(isRequestSameOrigin(headersWith("https://outboundbd.com", "same-site"), ALLOWED)).toBe(
      true,
    );
  });

  it("ignores a localhost entry in the allowlist once NODE_ENV=production (defense in depth)", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isRequestSameOrigin(headersWith("http://localhost:3000"), ALLOWED)).toBe(false);
    expect(isRequestSameOrigin(headersWith("https://outboundbd.com"), ALLOWED)).toBe(true);
  });

  it("allows a localhost entry outside production", () => {
    expect(isRequestSameOrigin(headersWith("http://localhost:3000"), ALLOWED)).toBe(true);
  });
});
