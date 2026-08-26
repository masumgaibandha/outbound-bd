import "server-only";

import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";

type SessionResult = Awaited<ReturnType<typeof auth.api.getSession>>;

/**
 * Session gating for API route handlers. `requireUser`/`requireRole` in
 * session.ts call `redirect()`, which only works from a server component —
 * route handlers need a JSON error response instead, hence these
 * lightweight counterparts (same pattern already used inline in
 * /api/orders and /api/orders/[orderId]/cancel).
 */
export async function requireUserSession(): Promise<
  { session: NonNullable<SessionResult>; response: null } | { session: null; response: NextResponse }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return {
      session: null,
      response: NextResponse.json({ ok: false, message: "Sign in required." }, { status: 401 }),
    };
  }
  return { session, response: null };
}

export async function requireAdminSession(): Promise<
  { session: NonNullable<SessionResult>; response: null } | { session: null; response: NextResponse }
> {
  const result = await requireUserSession();
  if (result.response) return result;

  if (result.session.user.role !== "ADMIN") {
    return {
      session: null,
      response: NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 }),
    };
  }
  return result;
}
