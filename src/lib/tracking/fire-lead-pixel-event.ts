/**
 * Fires the browser-side half of the agency "Lead" event, deduplicated
 * against the server-side CAPI call (`src/lib/tracking/capi.ts`) by
 * `eventId`. Only ever does anything if the Meta Pixel actually loaded —
 * `window.fbq` is undefined whenever the visitor is outside consent (denied,
 * or EEA/UK with no decision yet), so this needs no separate consent check
 * of its own.
 *
 * No `declare global` for `window.fbq` — same inline-cast style as
 * `MasterclassRegistrationForm.tsx`'s own `InitiateCheckout` call, so this
 * file and that one never fight over who owns the global's type.
 */
export function fireAgencyLeadPixelEvent(eventId: string): void {
  if (typeof window === "undefined") return;
  (window as { fbq?: (...args: unknown[]) => void }).fbq?.(
    "track",
    "Lead",
    {},
    { eventID: eventId },
  );
}
