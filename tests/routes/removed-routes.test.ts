import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Next's App Router 404s any path with no matching route file — there is no
// live server to hit inside Vitest, so the equivalent, fast-running
// guarantee is: assert none of the removed route directories/files exist on
// disk. If any of these come back, Next would once again serve that route.
const projectRoot = path.resolve(__dirname, "../..");

const REMOVED_ROUTE_GROUPS = [
  "src/app/(auth)",
  "src/app/(client-dashboard)",
  "src/app/(admin-dashboard)",
];

const REMOVED_PAGES = ["src/app/(public)/order"];

const REMOVED_API_ROUTES = [
  "src/app/api/auth",
  "src/app/api/orders",
  "src/app/api/payments",
  "src/app/api/payment-methods",
  "src/app/api/admin",
];

describe("removed platform routes stay removed", () => {
  it.each(REMOVED_ROUTE_GROUPS)("no route group remains at %s", (relPath) => {
    expect(existsSync(path.join(projectRoot, relPath))).toBe(false);
  });

  it.each(REMOVED_PAGES)("no page remains at %s", (relPath) => {
    expect(existsSync(path.join(projectRoot, relPath))).toBe(false);
  });

  it.each(REMOVED_API_ROUTES)("no API route handler remains at %s", (relPath) => {
    expect(existsSync(path.join(projectRoot, relPath))).toBe(false);
  });

  it("the public route group has no lingering account/dashboard/order pages", () => {
    const publicDir = path.join(projectRoot, "src/app/(public)");
    for (const removedSlug of ["order", "dashboard", "sign-in", "sign-up", "admin"]) {
      expect(existsSync(path.join(publicDir, removedSlug))).toBe(false);
    }
  });
});
