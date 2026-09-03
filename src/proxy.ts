import { NextResponse, type NextRequest } from "next/server";

import { getAdminAuthEnv } from "@/lib/masterclass/env";
import { timingSafeStringEqual } from "@/lib/masterclass/timing-safe-equal";

/*
 * The only proxy (formerly "middleware" — Next.js 16 renamed the file
 * convention; see node_modules/next/dist/docs/.../file-conventions/proxy.md)
 * in this project — scoped by `config.matcher` below to exactly
 * `/masterclass/admin/**`, so every other route (the entire agency site,
 * all agency API routes, the masterclass sales page itself) is completely
 * untouched by this file. This does NOT reintroduce the general agency
 * dashboard/auth system that was deliberately removed — it protects only
 * this one, small, masterclass-specific admin surface.
 *
 * HTTP Basic Auth, checked here, server-side, before any admin page render
 * reaches the browser. `MASTERCLASS_ADMIN_USER`/`MASTERCLASS_ADMIN_PASSWORD`
 * are the only two env vars this depends on; if either is unset, the route
 * fails closed (401 for every request, never a default/bypass credential).
 *
 * IMPORTANT: this is defense-in-depth, not the only authorization layer.
 * Next.js Server Actions are independently reachable endpoints — every
 * admin Server Action independently re-verifies the same credentials via
 * `requireMasterclassAdmin()` (`src/lib/masterclass/admin-auth.ts`), which
 * is the layer that actually gates any database mutation, email send, or
 * Meta CAPI call — not this file. Ported verbatim from the MasumDev
 * masterclass source.
 */

function unauthorized(): NextResponse {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Masterclass Admin"' },
  });
}

export function proxy(request: NextRequest): NextResponse {
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

export const config = {
  matcher: ["/masterclass/admin/:path*"],
};
