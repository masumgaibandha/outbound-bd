import { describe, expect, it } from "vitest";

import { expectedOriginFromRequestHeaders } from "@/lib/agency-admin/origin";

function makeHeaders(entries: Record<string, string>): Headers {
  return new Headers(entries);
}

describe("expectedOriginFromRequestHeaders", () => {
  it("prefers x-forwarded-host + x-forwarded-proto", () => {
    const headers = makeHeaders({
      "x-forwarded-host": "outbound-preview-abc123.vercel.app",
      "x-forwarded-proto": "https",
      host: "internal-lb.local",
    });
    expect(expectedOriginFromRequestHeaders(headers)).toBe("https://outbound-preview-abc123.vercel.app");
  });

  it("falls back to host when x-forwarded-host is absent", () => {
    const headers = makeHeaders({ host: "localhost:3000", "x-forwarded-proto": "http" });
    expect(expectedOriginFromRequestHeaders(headers)).toBe("http://localhost:3000");
  });

  it("defaults the protocol to https when x-forwarded-proto is absent", () => {
    const headers = makeHeaders({ "x-forwarded-host": "outboundbd.com" });
    expect(expectedOriginFromRequestHeaders(headers)).toBe("https://outboundbd.com");
  });

  it("returns null when neither host header is present", () => {
    const headers = makeHeaders({});
    expect(expectedOriginFromRequestHeaders(headers)).toBeNull();
  });
});
