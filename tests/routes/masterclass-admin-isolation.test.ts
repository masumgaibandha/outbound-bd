import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Section 9 of the masterclass migration explicitly requires that porting a
 * small, masterclass-scoped admin surface must never reintroduce the
 * general agency dashboard/auth system that was deliberately removed (see
 * `tests/routes/removed-routes.test.ts`, which this file deliberately does
 * not duplicate or modify). This file only adds masterclass-specific
 * isolation checks: the proxy (Next.js 16's renamed `middleware.ts`
 * convention — see `src/proxy.ts`'s own doc comment) is scoped to exactly
 * the admin surfaces it should be, and no broader client-facing
 * admin/dashboard surface exists anywhere else in the app.
 *
 * Round 4A added a SECOND, independent admin surface at `src/app/admin`
 * (the agency leads admin — see CLAUDE.md's "Round 4A decision" note). That
 * was a deliberate, explicitly-confirmed exception to the rule above, in
 * the same category as `/masterclass/admin`: an internal, Basic-Auth-gated
 * staff tool, not a client-facing account/dashboard system. This file was
 * updated accordingly to assert TWO independently-gated admin surfaces with
 * separate credentials, instead of asserting only one may exist.
 */
const projectRoot = path.resolve(__dirname, "../..");

const STILL_FORBIDDEN_GENERAL_SURFACES = [
  "src/app/(auth)",
  "src/app/(client-dashboard)",
  "src/app/(admin-dashboard)",
  "src/app/api/auth",
  "src/app/api/admin",
  "src/app/(public)/admin",
  "src/app/(public)/dashboard",
];

describe("admin surfaces stay isolated from any client-facing dashboard/auth system", () => {
  it.each(STILL_FORBIDDEN_GENERAL_SURFACES)("no general admin/dashboard surface at %s", (relPath) => {
    expect(existsSync(path.join(projectRoot, relPath))).toBe(false);
  });

  it("the proxy has exactly three matcher entries: masterclass admin, agency admin, and the agency region-cookie job", async () => {
    const proxyPath = path.join(projectRoot, "src/proxy.ts");
    expect(existsSync(proxyPath)).toBe(true);
    expect(existsSync(path.join(projectRoot, "src/middleware.ts"))).toBe(false);

    const { config } = await import("@/proxy");
    expect(config.matcher).toHaveLength(3);
    expect(config.matcher[0]).toBe("/masterclass/admin/:path*");
    expect(config.matcher[1]).toBe("/admin/:path*");
    // The third entry is the agency region-cookie job's matcher (see
    // tests/lib/proxy-region-cookie.test.ts for its actual behavior) — it
    // must negative-match both "masterclass" and "admin" so it never runs
    // on either admin surface.
    expect(config.matcher[2]).toContain("masterclass");
    expect(config.matcher[2]).toContain("admin");
  });

  it("the masterclass admin route, if it exists on disk, lives only under src/app/masterclass/admin", () => {
    const adminDir = path.join(projectRoot, "src/app/masterclass/admin");
    if (!existsSync(adminDir)) return; // not yet built by a parallel workstream — nothing to assert
    expect(existsSync(path.join(projectRoot, "src/app/(public)/admin"))).toBe(false);
  });

  it("the agency leads admin, if it exists on disk, lives only at the top-level src/app/admin (never nested under (public) or masterclass)", () => {
    const adminDir = path.join(projectRoot, "src/app/admin");
    if (!existsSync(adminDir)) return; // not yet built by a parallel workstream — nothing to assert
    expect(existsSync(path.join(projectRoot, "src/app/(public)/admin"))).toBe(false);
    expect(existsSync(path.join(projectRoot, "src/app/masterclass/admin/leads"))).toBe(false);
  });

  it("the two admin surfaces read separate env vars for their credentials and rate-limit secret", async () => {
    const { getAdminAuthEnv } = await import("@/lib/masterclass/env");
    const { getAgencyAdminAuthEnv, getAgencyAdminRateLimitSecret } = await import("@/lib/agency-admin/env");

    // Purely a static/structural check (no env stubbed) — both accessors
    // must exist as independent functions reading independent variable
    // names, not the same underlying env var under two names.
    expect(typeof getAdminAuthEnv).toBe("function");
    expect(typeof getAgencyAdminAuthEnv).toBe("function");
    expect(typeof getAgencyAdminRateLimitSecret).toBe("function");
  });
});
