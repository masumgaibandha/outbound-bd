/**
 * Fires a browser-only Meta Pixel "Contact" event for the /agencies
 * "Book a call" click. Same consent gating as `fireAgencyLeadPixelEvent()`
 * in `fire-lead-pixel-event.ts`: `window.fbq` only exists once the Pixel
 * actually loaded, which never happens outside consent, so this needs no
 * consent check of its own.
 *
 * Deliberately browser-only (no CAPI, no eventID): a click on an outbound
 * Calendly link isn't a submitted lead, and must never be reported as
 * "Lead". Kept in its own file so the existing Lead helper stays untouched.
 */
export function fireAgencyContactPixelEvent(): void {
  if (typeof window === "undefined") return;
  (window as { fbq?: (...args: unknown[]) => void }).fbq?.("track", "Contact");
}
