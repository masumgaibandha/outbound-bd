import "server-only";
import { headers } from "next/headers";

import { getAgencyAdminAuthEnv, getAgencyAdminRateLimitSecret } from "@/lib/agency-admin/env";
import { checkRateLimit } from "@/lib/masterclass/rate-limit";
import { extractClientIp } from "@/lib/masterclass/request-context";
import { timingSafeStringEqual } from "@/lib/masterclass/timing-safe-equal";

/**
 * The one centralized authorization check for every `/admin` (agency leads)
 * page, Server Action, and route handler — mirrors
 * `src/lib/masterclass/admin-auth.ts`'s `requireMasterclassAdmin()`
 * verbatim in structure, but reads `AGENCY_ADMIN_USER`/`AGENCY_ADMIN_PASSWORD`
 * and rate-limits under its own `"agency-admin-auth"` scope, keyed by its
 * own `AGENCY_ADMIN_RATE_LIMIT_SECRET` — entirely independent credentials
 * and rate-limit bucket from the masterclass admin, per the Round 4A
 * decision recorded in CLAUDE.md.
 *
 * `src/proxy.ts` also checks Basic Auth, scoped to `/admin/**`, but that is
 * defense-in-depth, not the authorization boundary — a Server Action's POST
 * isn't guaranteed to route through the same path-matched middleware that
 * protects a normal page load, so this function re-derives and re-verifies
 * the Basic Auth credentials from scratch, every time, regardless of what
 * already ran before it.
 */

export class UnauthorizedAgencyAdminError extends Error {
  constructor() {
    super("Admin authorization failed.");
    this.name = "UnauthorizedAgencyAdminError";
  }
}

function decodeBasicAuth(authHeader: string): { user: string; password: string } | null {
  if (!authHeader.startsWith("Basic ")) return null;

  let decoded: string;
  try {
    decoded = Buffer.from(authHeader.slice("Basic ".length), "base64").toString("utf-8");
  } catch {
    return null;
  }

  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) return null;

  return { user: decoded.slice(0, separatorIndex), password: decoded.slice(separatorIndex + 1) };
}

/**
 * Verifies the caller's `Authorization: Basic` header against
 * `AGENCY_ADMIN_USER`/`AGENCY_ADMIN_PASSWORD` and returns the verified
 * username — or throws `UnauthorizedAgencyAdminError`, never returns
 * `null`/`false`, so a caller can't accidentally skip the check by
 * forgetting to inspect a boolean.
 *
 * Rejects (throws) when: either env var is unset (fails closed); the
 * rate-limit secret is unset; the caller's IP can't be determined; the
 * caller has exceeded the rate limit; the header is missing, malformed, or
 * not `Basic`; or the supplied username/password don't both match, compared
 * with the same timing-safe function `proxy.ts` uses. The error message is
 * always the same generic string.
 */
export async function requireAgencyAdmin(): Promise<string> {
  const adminAuthEnv = getAgencyAdminAuthEnv();
  if (!adminAuthEnv) {
    throw new UnauthorizedAgencyAdminError();
  }
  const { username: expectedUser, password: expectedPassword } = adminAuthEnv;

  const rateLimitSecret = getAgencyAdminRateLimitSecret();
  if (!rateLimitSecret) {
    throw new UnauthorizedAgencyAdminError();
  }

  const headerList = await headers();

  const clientIp = extractClientIp(headerList);
  if (!clientIp) {
    throw new UnauthorizedAgencyAdminError();
  }

  const rateLimit = await checkRateLimit({
    scope: "agency-admin-auth",
    subject: clientIp,
    secret: rateLimitSecret,
  });
  if (!rateLimit.allowed) {
    throw new UnauthorizedAgencyAdminError();
  }

  const authHeader = headerList.get("authorization");
  if (!authHeader) {
    throw new UnauthorizedAgencyAdminError();
  }

  const credentials = decodeBasicAuth(authHeader);
  if (!credentials) {
    throw new UnauthorizedAgencyAdminError();
  }

  if (
    !timingSafeStringEqual(credentials.user, expectedUser) ||
    !timingSafeStringEqual(credentials.password, expectedPassword)
  ) {
    throw new UnauthorizedAgencyAdminError();
  }

  return credentials.user;
}
