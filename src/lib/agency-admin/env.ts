import "server-only";

/**
 * Server-only environment accessors for the agency leads admin at `/admin`
 * (Round 4A). Deliberately separate from `src/lib/masterclass/env.ts` — the
 * two admin surfaces (`/admin` and `/masterclass/admin`) are independently
 * gated, independently credentialed, and must never share a secret. See
 * CLAUDE.md's "Round 4A: agency leads admin" note for why this surface
 * exists and how it relates to the previously-removed general agency
 * dashboard. Every function reads `process.env` lazily, only when called.
 */

export interface AgencyAdminAuthEnv {
  username: string;
  password: string;
}

/** `null` if either credential is missing — `/admin` fails closed, never with a default credential. */
export function getAgencyAdminAuthEnv(): AgencyAdminAuthEnv | null {
  const username = process.env.AGENCY_ADMIN_USER;
  const password = process.env.AGENCY_ADMIN_PASSWORD;
  if (!username || !password) return null;
  return { username, password };
}

/** `null` if the rate-limit secret is missing — same fail-closed contract as the credentials above. */
export function getAgencyAdminRateLimitSecret(): string | null {
  const secret = process.env.AGENCY_ADMIN_RATE_LIMIT_SECRET;
  return secret && secret.length > 0 ? secret : null;
}
