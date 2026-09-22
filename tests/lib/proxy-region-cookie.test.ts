import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { proxy } from "@/proxy";
import { AGENCY_REGION_COOKIE } from "@/lib/tracking/consent";

function makeRequest(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost:3000${path}`, { headers });
}

beforeEach(() => {
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("proxy — agency region cookie", () => {
  it("sets obd_region=eea for an EU country code", () => {
    const response = proxy(makeRequest("/", { "x-vercel-ip-country": "DE" }));
    expect(response.cookies.get(AGENCY_REGION_COOKIE)?.value).toBe("eea");
  });

  it("sets obd_region=eea for GB (United Kingdom)", () => {
    const response = proxy(makeRequest("/", { "x-vercel-ip-country": "GB" }));
    expect(response.cookies.get(AGENCY_REGION_COOKIE)?.value).toBe("eea");
  });

  it("sets obd_region=other for a non-EU/EEA/UK country code", () => {
    const response = proxy(makeRequest("/", { "x-vercel-ip-country": "US" }));
    expect(response.cookies.get(AGENCY_REGION_COOKIE)?.value).toBe("other");
  });

  it("sets obd_region=other when the geo header is entirely missing", () => {
    const response = proxy(makeRequest("/"));
    expect(response.cookies.get(AGENCY_REGION_COOKIE)?.value).toBe("other");
  });

  it("does not write Set-Cookie at all when the existing cookie already matches", () => {
    const request = makeRequest("/", {
      "x-vercel-ip-country": "DE",
      cookie: `${AGENCY_REGION_COOKIE}=eea`,
    });
    const response = proxy(request);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("overwrites a stale region cookie when the geo header disagrees", () => {
    const request = makeRequest("/", {
      "x-vercel-ip-country": "US",
      cookie: `${AGENCY_REGION_COOKIE}=eea`,
    });
    const response = proxy(request);
    expect(response.cookies.get(AGENCY_REGION_COOKIE)?.value).toBe("other");
  });

  it("applies the region-cookie logic to an ordinary public page", () => {
    const response = proxy(makeRequest("/services/cold-email-outreach", { "x-vercel-ip-country": "FR" }));
    expect(response.cookies.get(AGENCY_REGION_COOKIE)?.value).toBe("eea");
  });
});

describe("proxy — masterclass admin auth is unaffected by the region-cookie logic", () => {
  it("still gates /masterclass/admin/** with 401 + WWW-Authenticate when admin credentials are unconfigured", () => {
    const response = proxy(makeRequest("/masterclass/admin/orders"));
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toContain("Basic");
  });

  it("accepts correct Basic Auth credentials for /masterclass/admin/**", () => {
    vi.stubEnv("MASTERCLASS_ADMIN_USER", "admin");
    vi.stubEnv("MASTERCLASS_ADMIN_PASSWORD", "correct-horse-battery-staple");
    const credentials = Buffer.from("admin:correct-horse-battery-staple").toString("base64");
    const response = proxy(
      makeRequest("/masterclass/admin/orders", { authorization: `Basic ${credentials}` }),
    );
    expect(response.status).toBe(200);
  });

  it("never sets the agency region cookie on a masterclass admin request", () => {
    vi.stubEnv("MASTERCLASS_ADMIN_USER", "admin");
    vi.stubEnv("MASTERCLASS_ADMIN_PASSWORD", "correct-horse-battery-staple");
    const credentials = Buffer.from("admin:correct-horse-battery-staple").toString("base64");
    const response = proxy(
      makeRequest("/masterclass/admin/orders", {
        authorization: `Basic ${credentials}`,
        "x-vercel-ip-country": "DE",
      }),
    );
    expect(response.cookies.get(AGENCY_REGION_COOKIE)).toBeUndefined();
  });
});
