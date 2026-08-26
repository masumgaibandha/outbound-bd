import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import type { Role } from "@/lib/roles";

export type SessionUser = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>["user"];

export async function getCurrentSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Verifies a real session server-side and redirects unauthenticated
 * visitors. Never trust a client-supplied role or session value; this
 * always re-checks against the database-backed session.
 */
export async function requireUser(redirectTo = "/sign-in") {
  const session = await getCurrentSession();

  if (!session) {
    redirect(redirectTo);
  }

  return session.user as SessionUser & { role: Role };
}

/**
 * Same as `requireUser`, but also enforces the user's role matches one
 * of `allowedRoles`. Used at the top of dashboard route-group layouts
 * so every nested page inherits the check.
 *
 * `signInRedirect` is where an unauthenticated visitor is sent (with the
 * destination preserved so they land back here after signing in);
 * `unauthorizedRedirect` is where an authenticated user of the wrong role
 * is sent instead (they're already signed in, so there's nothing to
 * preserve — just route them to a page they're allowed to see).
 */
export async function requireRole(
  allowedRoles: Role[],
  options: { signInRedirect?: string; unauthorizedRedirect?: string } = {},
) {
  const user = await requireUser(options.signInRedirect);

  if (!allowedRoles.includes(user.role)) {
    redirect(options.unauthorizedRedirect ?? "/");
  }

  return user;
}
