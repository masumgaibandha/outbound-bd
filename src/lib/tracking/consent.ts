import { isEeaOrUkCountry } from "@/lib/tracking/geo";

/**
 * First-party cookies for the agency Meta Pixel consent gate. Both are pure
 * strings with no framework dependency, so this module is safe to import
 * from `proxy.ts` (Node runtime, no `next/headers`), from the client-side
 * `TrackingGate`, and from the `/api/inquiries` Route Handler alike.
 */
export const AGENCY_REGION_COOKIE = "obd_region";
export const AGENCY_AD_CONSENT_COOKIE = "obd_ad_consent";

export type AgencyRegion = "eea" | "other";
export type TrackingConsentChoice = "granted" | "denied";

/**
 * Used only by `proxy.ts`, which always has a fresh `x-vercel-ip-country`
 * header to check. Falls back to "other" only when that header is entirely
 * absent (e.g. a non-Vercel local dev server) — a different, and
 * deliberately less conservative, fallback than `isTrackingAllowed`'s below,
 * which instead treats a *missing cookie* as EEA/UK. The two are answering
 * different questions: this one classifies a visitor proxy just observed;
 * that one decides what to do when no classification was ever recorded.
 */
export function regionFromCountryCode(countryCode: string | null | undefined): AgencyRegion {
  return isEeaOrUkCountry(countryCode) ? "eea" : "other";
}

interface TrackingContext {
  /** Raw `obd_region` cookie value. Missing/anything but "other" is treated as EEA/UK — the safe default when the proxy hasn't run yet, the cookie was blocked, or a caller bypassed it entirely (e.g. a direct API call). */
  region: string | undefined;
  /** Raw `obd_ad_consent` cookie value. */
  consent: string | undefined;
}

function isEeaOrUnknownRegion(region: string | undefined): boolean {
  return region !== "other";
}

export function isTrackingAllowed({ region, consent }: TrackingContext): boolean {
  if (!isEeaOrUnknownRegion(region)) return true;
  return consent === "granted";
}

export function shouldShowConsentBanner({ region, consent }: TrackingContext): boolean {
  if (!isEeaOrUnknownRegion(region)) return false;
  return consent !== "granted" && consent !== "denied";
}

/**
 * Parses a raw `Cookie` request header (`"a=1; b=2"`) without pulling in
 * `next/headers` — used by the `/api/inquiries` Route Handler, which already
 * reads every other signal (IP, honeypot, timing) straight off the plain
 * `Request` it receives rather than via Next's ambient request APIs.
 */
export function readCookieHeaderValue(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = part.slice(0, separatorIndex).trim();
    if (key !== name) continue;
    const value = part.slice(separatorIndex + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return undefined;
}
