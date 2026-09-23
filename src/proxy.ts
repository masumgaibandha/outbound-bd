import { NextResponse, type NextRequest } from "next/server";

import { getAgencyAdminAuthEnv } from "@/lib/agency-admin/env";
import { getAdminAuthEnv } from "@/lib/masterclass/env";
import { timingSafeStringEqual } from "@/lib/masterclass/timing-safe-equal";
import { AGENCY_REGION_COOKIE, regionFromCountryCode } from "@/lib/tracking/consent";

/*
 * The only proxy (formerly "middleware" — Next.js 16 renamed the file
 * convention; see node_modules/next/dist/docs/.../file-conventions/proxy.md)
 * in this project. It does three independent jobs, gated by three separate
 * `config.matcher` entries below:
 *
 * 1. HTTP Basic Auth for `/masterclass/admin/**` — unchanged from before
 *    this file grew more jobs (see `handleMasterclassAdminAuth` below,
 *    moved verbatim out of the old top-level `proxy()` body). This does NOT
 *    reintroduce the general agency dashboard/auth system that was
 *    deliberately removed — it protects only this one, small,
 *    masterclass-specific admin surface.
 *
 * 2. HTTP Basic Auth for `/admin/**` — the Round 4A agency leads admin (see
 *    `handleAgencyAdminAuth` below and CLAUDE.md's "Round 4A" note). Same
 *    category as job 1 (an internal, Basic-Auth-gated staff tool, not a
 *    client-facing account/dashboard system), but with its own env vars
 *    (`AGENCY_ADMIN_USER`/`AGENCY_ADMIN_PASSWORD`) and completely
 *    independent from job 1 — neither admin surface's credentials work for
 *    the other.
 *
 * 3. A first-party `obd_region` cookie ("eea" | "other") on every other
 *    public agency page (see `handleAgencyRegionCookie`), read by the
 *    client-side agency Meta Pixel consent gate
 *    (`src/components/public/tracking-gate.tsx`) to decide whether a
 *    visitor needs the UK/EU/EEA consent banner before the Pixel loads —
 *    without that gate ever calling `headers()`/`cookies()` from a Server
 *    Component, which would force the whole public site out of static
 *    generation. Deliberately just a cookie write: no redirect, no
 *    response-body change, so this runs in front of the cache rather than
 *    disabling it. `/masterclass/**` (the sales page included) and
 *    `/admin/**` are excluded from this job — masterclass has its own,
 *    separate, unconditional Meta Pixel
 *    (`src/components/masterclass/MetaPixel.tsx`), and `/admin` must never
 *    load the Pixel or a consent banner at all (it's a staff tool, not a
 *    tracked marketing page) — untouched by this file either way.
 *
 * IMPORTANT: jobs 1 and 2 are defense-in-depth, not the only authorization
 * layer. Next.js Server Actions are independently reachable endpoints —
 * every admin Server Action independently re-verifies the same credentials
 * via `requireMasterclassAdmin()` (`src/lib/masterclass/admin-auth.ts`) or
 * `requireAgencyAdmin()` (`src/lib/agency-admin/admin-auth.ts`), which are
 * the layers that actually gate any database mutation — not this file. Job
 * 1's logic was ported verbatim from the MasumDev masterclass source; job 2
 * mirrors its structure for the agency admin.
 */

function unauthorized(realm: string): NextResponse {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": `Basic realm="${realm}"` },
  });
}

function checkBasicAuth(
  request: NextRequest,
  expectedUser: string,
  expectedPassword: string,
  realm: string,
): NextResponse {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return unauthorized(realm);
  }

  let decoded: string;
  try {
    decoded = Buffer.from(authHeader.slice("Basic ".length), "base64").toString("utf-8");
  } catch {
    return unauthorized(realm);
  }

  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) return unauthorized(realm);

  const suppliedUser = decoded.slice(0, separatorIndex);
  const suppliedPassword = decoded.slice(separatorIndex + 1);

  if (
    !timingSafeStringEqual(suppliedUser, expectedUser) ||
    !timingSafeStringEqual(suppliedPassword, expectedPassword)
  ) {
    return unauthorized(realm);
  }

  return NextResponse.next();
}

function handleMasterclassAdminAuth(request: NextRequest): NextResponse {
  const adminAuthEnv = getAdminAuthEnv();
  if (!adminAuthEnv) {
    return unauthorized("Masterclass Admin");
  }
  return checkBasicAuth(request, adminAuthEnv.username, adminAuthEnv.password, "Masterclass Admin");
}

function handleAgencyAdminAuth(request: NextRequest): NextResponse {
  const adminAuthEnv = getAgencyAdminAuthEnv();
  if (!adminAuthEnv) {
    return unauthorized("Agency Admin");
  }
  return checkBasicAuth(request, adminAuthEnv.username, adminAuthEnv.password, "Agency Admin");
}

const REGION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

/** Only writes `Set-Cookie` when the region actually changed (or was never set) — every other request is a pure passthrough, so a cached static page's response is left otherwise untouched. */
function handleAgencyRegionCookie(request: NextRequest): NextResponse {
  const region = regionFromCountryCode(request.headers.get("x-vercel-ip-country"));
  const existing = request.cookies.get(AGENCY_REGION_COOKIE)?.value;

  if (existing === region) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.cookies.set(AGENCY_REGION_COOKIE, region, {
    maxAge: REGION_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

export function proxy(request: NextRequest): NextResponse {
  if (request.nextUrl.pathname.startsWith("/masterclass/admin")) {
    return handleMasterclassAdminAuth(request);
  }
  if (request.nextUrl.pathname.startsWith("/admin")) {
    return handleAgencyAdminAuth(request);
  }
  return handleAgencyRegionCookie(request);
}

export const config = {
  matcher: [
    "/masterclass/admin/:path*",
    "/admin/:path*",
    // Every public agency page except API routes, Next's own static/image
    // assets, the masterclass tree and /admin (job 3 is agency-marketing-page-only
    // — see doc comment above), and well-known static metadata files.
    "/((?!api|_next/static|_next/image|masterclass|admin|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
