import "server-only";

/**
 * Server-side Meta Conversions API config for the AGENCY dataset —
 * deliberately separate from `src/lib/masterclass/env.ts`'s
 * `getMetaCapiEnv()`, which reads the masterclass's own `META_PIXEL_ID`/
 * `META_CAPI_ACCESS_TOKEN`. The two pixels/datasets must never share
 * config. `null` if either half is missing, so a misconfigured or entirely
 * unconfigured deployment just silently sends no CAPI events rather than
 * throwing. The browser pixel ID (`NEXT_PUBLIC_AGENCY_META_PIXEL_ID`) is
 * read directly where it's used (`TrackingGate`, a Client Component) — it's
 * public by design, same as the masterclass sales page's own direct
 * `process.env.NEXT_PUBLIC_META_PIXEL_ID` read.
 */
export interface AgencyMetaCapiEnv {
  pixelId: string;
  capiAccessToken: string;
}

export function getAgencyMetaCapiEnv(): AgencyMetaCapiEnv | null {
  const pixelId = process.env.AGENCY_META_PIXEL_ID;
  const capiAccessToken = process.env.AGENCY_META_CAPI_ACCESS_TOKEN;
  if (!pixelId || !capiAccessToken) return null;
  return { pixelId, capiAccessToken };
}
