/**
 * Server-derived request context only — nothing here ever reads a
 * client-submitted IP or user-agent value from a request body. Invalid or
 * missing values resolve to `null` rather than throwing. Ported verbatim
 * from the MasumDev masterclass source.
 *
 * `x-vercel-forwarded-for` is checked first — Vercel's own edge network
 * sets it, and unlike the generic `x-forwarded-for` it can't be spoofed by
 * a client sending its own copy, since Vercel overwrites it.
 * `x-forwarded-for`/`x-real-ip` remain as fallbacks for non-Vercel
 * environments (e.g. local dev).
 */

const MAX_IP_LENGTH = 64;
const MAX_USER_AGENT_LENGTH = 512;

const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const IPV6_PATTERN = /^[0-9a-fA-F:]+$/;

function isSyntacticallyValidIp(candidate: string): boolean {
  if (candidate.length === 0 || candidate.length > MAX_IP_LENGTH) return false;

  const ipv4Match = IPV4_PATTERN.exec(candidate);
  if (ipv4Match) {
    return ipv4Match.slice(1, 5).every((octet) => Number(octet) <= 255);
  }

  return candidate.includes(":") && IPV6_PATTERN.test(candidate);
}

function firstValidIpFrom(headerValue: string): string | null {
  for (const candidate of headerValue.split(",")) {
    const trimmed = candidate.trim();
    if (isSyntacticallyValidIp(trimmed)) {
      return trimmed.slice(0, MAX_IP_LENGTH);
    }
  }
  return null;
}

export function extractClientIp(headers: Headers): string | null {
  const vercelForwardedFor = headers.get("x-vercel-forwarded-for");
  if (vercelForwardedFor) {
    const fromVercel = firstValidIpFrom(vercelForwardedFor);
    if (fromVercel) return fromVercel;
  }

  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const fromForwardedFor = firstValidIpFrom(forwardedFor);
    if (fromForwardedFor) return fromForwardedFor;
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp && isSyntacticallyValidIp(realIp)) {
    return realIp.slice(0, MAX_IP_LENGTH);
  }

  return null;
}

export function extractClientUserAgent(headers: Headers): string | null {
  const userAgent = headers.get("user-agent")?.trim();
  if (!userAgent) return null;
  return userAgent.slice(0, MAX_USER_AGENT_LENGTH);
}
