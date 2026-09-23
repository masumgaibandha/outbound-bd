/**
 * Same-origin verification for `/admin`'s Server Actions, derived from the
 * request itself rather than a fixed configured URL. `NEXT_PUBLIC_APP_URL`
 * (what the masterclass admin's equivalent check effectively mirrors via
 * `MASTERCLASS_ALLOWED_ORIGINS`) only ever holds one value per environment
 * and can't anticipate Vercel's per-deployment Preview URLs, which change on
 * every build — a fixed allowlist entry is either right for Production or
 * right for one specific Preview, never both. Deriving the expected origin
 * from `x-forwarded-host`/`host` and `x-forwarded-proto` instead — the
 * headers Vercel's own edge network sets on every request, including
 * Preview — is correct in dev, every Preview, and Production without any
 * per-environment configuration, and can never drift out of sync with the
 * actual deployment the way a hardcoded URL can.
 */

/**
 * `x-forwarded-host` is preferred over `host` because it's the header
 * Vercel's edge network sets to the actual public-facing hostname the
 * browser connected to; `host` is kept only as a fallback for local dev,
 * where no proxy sits in front of the Next.js server to set it.
 * `x-forwarded-proto` defaults to `"https"` — every real deployment
 * (Preview included) is HTTPS-only, so an absent header here is never a
 * legitimate plain-HTTP request worth trusting less strictly than that.
 * `null` if no host header is present at all — the caller must treat that
 * as a same-origin failure, never as "no restriction".
 */
export function expectedOriginFromRequestHeaders(headers: Headers): string | null {
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (!host) return null;
  const proto = headers.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}
