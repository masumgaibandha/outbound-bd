import "server-only";
import { headers } from "next/headers";

import { UnauthorizedAgencyAdminError, requireAgencyAdmin } from "@/lib/agency-admin/admin-auth";
import { NOT_AUTHORIZED_MESSAGE, ORIGIN_REJECTED_MESSAGE } from "@/lib/agency-admin/messages";
import { expectedOriginFromRequestHeaders } from "@/lib/agency-admin/origin";
import { isRequestSameOrigin } from "@/lib/masterclass/origin-validation";

/**
 * The one authorization check every `/admin` mutating Server Action calls
 * first (leads, clients, payments alike) — extracted out of
 * `leads/actions.ts` in Round 4B so clients/payments actions share this
 * exact implementation instead of a second copy. Behavior and messages are
 * unchanged from the Round 4A-fix version.
 *
 * Two independent checks, kept distinguishable in the returned message
 * (never by revealing a credential or header value): `requireAgencyAdmin()`
 * (Basic Auth + rate limit) first, then a same-origin check comparing the
 * request's `Origin` header against an origin DERIVED from the request
 * itself (`expectedOriginFromRequestHeaders` — `x-forwarded-host`/`host` +
 * `x-forwarded-proto`), not a fixed configured URL — see that function's own
 * doc comment for why a fixed URL can never be correct for both Production
 * and every Preview deployment. `isRequestSameOrigin` already rejects
 * (never allows) when the `Origin` header is missing entirely.
 *
 * Read-only route handlers (the CSV exports) call `requireAgencyAdmin()`
 * directly instead — the origin check here is specifically CSRF
 * defense-in-depth for state-changing requests, not a general auth gate.
 */
export type AuthorizeActionResult = { ok: true } | { ok: false; message: string };

export async function authorizeAgencyAdminAction(): Promise<AuthorizeActionResult> {
  try {
    await requireAgencyAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedAgencyAdminError) {
      return { ok: false, message: NOT_AUTHORIZED_MESSAGE };
    }
    throw error;
  }

  const headerList = await headers();
  const expectedOrigin = expectedOriginFromRequestHeaders(headerList);
  if (!expectedOrigin || !isRequestSameOrigin(headerList, [expectedOrigin])) {
    return { ok: false, message: ORIGIN_REJECTED_MESSAGE };
  }

  return { ok: true };
}
