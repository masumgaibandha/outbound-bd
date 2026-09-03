import "server-only";
import { headers } from "next/headers";

import { getAdminAuthEnv, getAdminSecurityEnv } from "@/lib/masterclass/env";
import { checkRateLimit } from "@/lib/masterclass/rate-limit";
import { extractClientIp } from "@/lib/masterclass/request-context";
import { timingSafeStringEqual } from "@/lib/masterclass/timing-safe-equal";

/**
 * The one centralized authorization check for every masterclass admin
 * mutation and read — approve, reject, retry a failed email/CAPI send, and
 * the admin queue page itself all call `requireMasterclassAdmin()` as their
 * first line, before touching any repository, service, email, or Meta call.
 * Ported verbatim from the MasumDev masterclass source.
 *
 * `src/proxy.ts` also checks Basic Auth, scoped to
 * `/masterclass/admin/**`, but that is defense-in-depth, not the
 * authorization boundary. Next.js Server Actions are dispatched by an
 * action-ID lookup that isn't strictly bound to the URL a middleware
 * `matcher` protects — a raw POST carrying a valid action reference can
 * reach a Server Action's code without ever passing through the proxy
 * for the route that action was defined on. So this function re-derives
 * and re-verifies the Basic Auth credentials from scratch, every time,
 * regardless of what already ran before it.
 *
 * Deliberate addition (not present in the MasumDev source): every call —
 * before even reading the `Authorization` header — is throttled through the
 * durable `checkRateLimit` limiter under the `"admin-auth"` scope, keyed by
 * client IP. This is the task's explicit "rate-limit failed auth attempts"
 * requirement; counting every call (not only failures) is the simplest
 * correct way to bound the rate at which credentials can be guessed at all,
 * and the limit (20 / 15 min, see `rate-limit.ts`) is generous enough that a
 * legitimate operator's normal click burst never trips it.
 */

export class UnauthorizedAdminError extends Error {
  constructor() {
    super("Admin authorization failed.");
    this.name = "UnauthorizedAdminError";
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
 * `MASTERCLASS_ADMIN_USER`/`MASTERCLASS_ADMIN_PASSWORD` and returns the
 * verified username (for `verifiedBy` on the payment order) — or throws
 * `UnauthorizedAdminError`, never returns `null`/`false`, so a caller can't
 * accidentally skip the check by forgetting to inspect a boolean.
 *
 * Rejects (throws) when: either env var is unset (fails closed); the
 * header is missing, malformed, or not `Basic`; or the supplied
 * username/password don't both match, compared with the same timing-safe
 * function `proxy.ts` uses. The error message is always the same
 * generic string.
 */
export async function requireMasterclassAdmin(): Promise<string> {
  const adminAuthEnv = getAdminAuthEnv();
  if (!adminAuthEnv) {
    throw new UnauthorizedAdminError();
  }
  const { username: expectedUser, password: expectedPassword } = adminAuthEnv;

  const headerList = await headers();

  const adminSecurityEnv = getAdminSecurityEnv();
  if (!adminSecurityEnv) {
    throw new UnauthorizedAdminError();
  }
  const clientIp = extractClientIp(headerList);
  if (!clientIp) {
    throw new UnauthorizedAdminError();
  }
  const rateLimit = await checkRateLimit({
    scope: "admin-auth",
    subject: clientIp,
    secret: adminSecurityEnv.rateLimitSecret,
  });
  if (!rateLimit.allowed) {
    throw new UnauthorizedAdminError();
  }

  const authHeader = headerList.get("authorization");
  if (!authHeader) {
    throw new UnauthorizedAdminError();
  }

  const credentials = decodeBasicAuth(authHeader);
  if (!credentials) {
    throw new UnauthorizedAdminError();
  }

  if (
    !timingSafeStringEqual(credentials.user, expectedUser) ||
    !timingSafeStringEqual(credentials.password, expectedPassword)
  ) {
    throw new UnauthorizedAdminError();
  }

  return credentials.user;
}
