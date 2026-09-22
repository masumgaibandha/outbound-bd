/**
 * Passes the visitor's name/email from the /agencies form to the
 * /agencies/thank-you page's Calendly prefill, without ever putting either
 * in a URL — the Meta Pixel sends the current page URL to Meta on every
 * PageView, so a name/email in the URL would leak straight into Meta's
 * systems. sessionStorage only, read once and cleared immediately after,
 * so it never lingers for a later unrelated visit in the same tab.
 */
const STORAGE_KEY = "obd_agency_lead_prefill";

export interface AgencyLeadPrefill {
  name: string;
  email: string;
}

export function storeAgencyLeadPrefill(prefill: AgencyLeadPrefill): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(prefill));
  } catch {
    /* Private browsing / blocked storage — the thank-you page just shows the Calendly embed unprefilled. */
  }
}

/** Reads and immediately clears the stored prefill — call at most once per thank-you page visit. */
export function consumeAgencyLeadPrefill(): AgencyLeadPrefill | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    window.sessionStorage.removeItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as AgencyLeadPrefill).name === "string" &&
      typeof (parsed as AgencyLeadPrefill).email === "string"
    ) {
      return parsed as AgencyLeadPrefill;
    }
    return null;
  } catch {
    return null;
  }
}
