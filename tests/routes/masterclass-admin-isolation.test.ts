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
 * one path, and no broader admin/dashboard surface exists anywhere else in
 * the app.
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

describe("masterclass admin surface stays isolated", () => {
  it.each(STILL_FORBIDDEN_GENERAL_SURFACES)("no general admin/dashboard surface at %s", (relPath) => {
    expect(existsSync(path.join(projectRoot, relPath))).toBe(false);
  });

  it("the only proxy in the project is scoped to /masterclass/admin", async () => {
    const proxyPath = path.join(projectRoot, "src/proxy.ts");
    expect(existsSync(proxyPath)).toBe(true);
    expect(existsSync(path.join(projectRoot, "src/middleware.ts"))).toBe(false);

    const { config } = await import("@/proxy");
    expect(config.matcher).toEqual(["/masterclass/admin/:path*"]);
  });

  it("if a masterclass admin route exists on disk, it lives only under src/app/masterclass/admin", () => {
    const adminDir = path.join(projectRoot, "src/app/masterclass/admin");
    if (!existsSync(adminDir)) return; // not yet built by a parallel workstream — nothing to assert

    // No sibling top-level admin surface should exist outside this one scoped location.
    expect(existsSync(path.join(projectRoot, "src/app/admin"))).toBe(false);
  });
});
