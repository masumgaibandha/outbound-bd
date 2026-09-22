import { NextResponse, type NextRequest } from "next/server";

import { getAdminAuthEnv } from "@/lib/masterclass/env";
import { timingSafeStringEqual } from "@/lib/masterclass/timing-safe-equal";
import { AGENCY_REGION_COOKIE, regionFromCountryCode } from "@/lib/tracking/consent";

/*
 * The only proxy (formerly "middleware" — Next.js 16 renamed the file
 * convention; see node_modules/next/dist/docs/.../file-conventions/proxy.md)
 * in this project. It does two independent jobs, gated by two separate
 * `config.matcher` entries below:
 *
 * 1. HTTP Basic Auth for `/masterclass/admin/**` — unchanged from before
 *    this file grew a second job (see `handleMasterclassAdminAuth` below,
 *    moved verbatim out of the old top-level `proxy()` body). This does NOT
 *    reintroduce the general agency dashboard/auth system that was
 *    deliberately removed — it protects only this one, small,
 *    masterclass-specific admin surface.
 *
 * 2. A first-party `obd_region` cookie ("eea" | "other") on every other
 *    public agency page (see `handleAgencyRegionCookie`), read by the
 *    client-side agency Meta Pixel consent gate
 *    (`src/components/public/tracking-gate.tsx`) to decide whether a
 *    visitor needs the UK/EU/EEA consent banner before the Pixel loads —
 *    without that gate ever calling `headers()`/`cookies()` from a Server
 *    Component, which would force the whole public site out of static
 *    generation. Deliberately just a cookie write: no redirect, no
 *    response-body change, so this runs in front of the cache rather than
 *    disabling it. `/masterclass/**` (the sales page included) is excluded
 *    from this job — that route has its own, separate, unconditional Meta
 *    Pixel (`src/components/masterclass/MetaPixel.tsx`), untouched by this
 *    file.
 *
 * IMPORTANT: job 1 is defense-in-depth, not the only authorization layer.
 * Next.js Server Actions are independently reachable endpoints — every
 * admin Server Action independently re-verifies the same credentials via
 * `requireMasterclassAdmin()` (`src/lib/masterclass/admin-auth.ts`), which
 * is the layer that actually gates any database mutation, email send, or
 * Meta CAPI call — not this file. Job 1's logic was ported verbatim from
 * the MasumDev masterclass source.
 */

function unauthorized(): NextResponse {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Masterclass Admin"' },
  });
}

function handleMasterclassAdminAuth(request: NextRequest): NextResponse {
  const adminAuthEnv = getAdminAuthEnv();
  if (!adminAuthEnv) {
    return unauthorized();
  }
  const { username: expectedUser, password: expectedPassword } = adminAuthEnv;

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return unauthorized();
  }

  let decoded: string;
  try {
    decoded = Buffer.from(authHeader.slice("Basic ".length), "base64").toString("utf-8");
  } catch {
    return unauthorized();
  }

  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) return unauthorized();

  const suppliedUser = decoded.slice(0, separatorIndex);
  const suppliedPassword = decoded.slice(separatorIndex + 1);

  if (
    !timingSafeStringEqual(suppliedUser, expectedUser) ||
    !timingSafeStringEqual(suppliedPassword, expectedPassword)
  ) {
    return unauthorized();
  }

  return NextResponse.next();
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
  return handleAgencyRegionCookie(request);
}

export const config = {
  matcher: [
    "/masterclass/admin/:path*",
    // Every public agency page except API routes, Next's own static/image
    // assets, the masterclass tree (job 2 is agency-only — see doc comment
    // above), and well-known static metadata files.
    "/((?!api|_next/static|_next/image|masterclass|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
