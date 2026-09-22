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
  /**
   * Optional. When set, `dispatchAgencyLeadCapi` includes it as
   * `test_event_code` in the CAPI payload, which routes the event into
   * Meta Events Manager's Test Events tool instead of counting it as real
   * traffic — for verifying CAPI delivery end-to-end without polluting the
   * dataset. Must be removed from Production once testing is done (see
   * .env.example) — left set, every real visitor's Lead event would be
   * diverted into Test Events instead of being counted normally.
   */
  testEventCode: string | undefined;
}

export function getAgencyMetaCapiEnv(): AgencyMetaCapiEnv | null {
  const pixelId = process.env.AGENCY_META_PIXEL_ID;
  const capiAccessToken = process.env.AGENCY_META_CAPI_ACCESS_TOKEN;
  if (!pixelId || !capiAccessToken) return null;
  const testEventCode = process.env.AGENCY_META_TEST_EVENT_CODE?.trim() || undefined;
  return { pixelId, capiAccessToken, testEventCode };
}
