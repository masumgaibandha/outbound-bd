import "server-only";

import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

type SessionResult = Awaited<ReturnType<typeof auth.api.getSession>>;

/**
 * Session gating for API route handlers. `requireUser`/`requireRole` in
 * session.ts call `redirect()`, which only works from a server component —
 * route handlers need a JSON error response instead, hence these
 * lightweight counterparts.
 *
 * Takes the route handler's own `Request` and reads `request.headers`
 * directly rather than calling `next/headers`'s `headers()` — both return
 * the same cookie data inside a real route handler, but `request.headers`
 * doesn't depend on Next's per-request AsyncLocalStorage context, which
 * means these route handlers can be invoked directly in tests (as plain
 * async functions) without running a real Next.js server.
 */
export async function requireUserSession(
  request: Request,
): Promise<
  { session: NonNullable<SessionResult>; response: null } | { session: null; response: NextResponse }
> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return {
      session: null,
      response: NextResponse.json({ ok: false, message: "Sign in required." }, { status: 401 }),
    };
  }
  return { session, response: null };
}

export async function requireAdminSession(
  request: Request,
): Promise<
  { session: NonNullable<SessionResult>; response: null } | { session: null; response: NextResponse }
> {
  const result = await requireUserSession(request);
  if (result.response) return result;

  if (result.session.user.role !== "ADMIN") {
    return {
      session: null,
      response: NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 }),
    };
  }
  return result;
}
