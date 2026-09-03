/**
 * Same-origin enforcement for the masterclass registration/payment POST
 * routes only — deliberately not a general CORS layer. Never reflects an
 * origin back, never sets an `Access-Control-*` header, never logs a
 * rejected origin. Ported verbatim from the MasumDev masterclass source.
 */

function isLocalhostHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function normalizeOrigin(raw: string): string | null {
  try {
    const url = new URL(raw);
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

function originHostname(origin: string): string | null {
  try {
    return new URL(origin).hostname;
  } catch {
    return null;
  }
}

/**
 * `allowedOrigins` is the raw, parsed `MASTERCLASS_ALLOWED_ORIGINS` list
 * from `getSecurityEnv()`. In production, any localhost-hostname entry is
 * ignored here as a defense-in-depth safety net — a misconfigured env var
 * (e.g. a local `.env.local` default carried over by mistake) must never
 * grant a localhost origin real access once `NODE_ENV === "production"`.
 */
export function isRequestSameOrigin(
  headers: Headers,
  allowedOrigins: readonly string[],
): boolean {
  const originHeader = headers.get("origin");
  if (!originHeader || originHeader === "null") return false;

  const normalizedOrigin = normalizeOrigin(originHeader);
  if (!normalizedOrigin) return false;

  const isProduction = process.env.NODE_ENV === "production";
  const effectiveAllowlist = isProduction
    ? allowedOrigins.filter((origin) => {
        const hostname = originHostname(origin);
        return hostname !== null && !isLocalhostHostname(hostname);
      })
    : allowedOrigins;

  if (!effectiveAllowlist.includes(normalizedOrigin)) return false;

  const secFetchSite = headers.get("sec-fetch-site");
  if (secFetchSite && secFetchSite !== "same-origin" && secFetchSite !== "same-site") {
    return false;
  }

  return true;
}
