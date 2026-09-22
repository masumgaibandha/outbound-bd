import { agencyAttributionSchema, type AgencyAttributionInput } from "@/lib/agency-inquiry-schema";

/**
 * First-touch ad/campaign attribution for the /agencies landing page.
 * "First touch" means: capture once, on the visitor's first load of this
 * session, and never overwrite it — a later reload or in-session
 * navigation without UTM params in the URL must not blank out attribution
 * that was already captured. sessionStorage (not localStorage) is
 * deliberate: attribution should reset for a genuinely new visit/session,
 * not follow the visitor indefinitely across unrelated future sessions.
 */
const STORAGE_KEY = "obd_agency_attribution";

const UTM_PARAM_MAP: Record<string, keyof AgencyAttributionInput> = {
  utm_source: "utmSource",
  utm_medium: "utmMedium",
  utm_campaign: "utmCampaign",
  utm_content: "utmContent",
  utm_term: "utmTerm",
};

function readFromUrl(): AgencyAttributionInput {
  const params = new URLSearchParams(window.location.search);
  const raw: Record<string, string> = {};

  for (const [param, key] of Object.entries(UTM_PARAM_MAP)) {
    const value = params.get(param);
    if (value) raw[key] = value;
  }

  const fbclid = params.get("fbclid");
  if (fbclid) raw.fbclid = fbclid;

  raw.landingPath = window.location.pathname;

  const parsed = agencyAttributionSchema.safeParse(raw);
  return parsed.success ? parsed.data : {};
}

/**
 * Call once, as early as possible on the landing page (the lead form's own
 * mount effect is a fine place — there's no other client component on this
 * page that needs it sooner). No-ops outside the browser. Idempotent within
 * a session: if attribution is already stored, this does nothing, even if
 * the current URL has different (or no) UTM params.
 */
export function captureAgencyAttributionOnLoad(): void {
  if (typeof window === "undefined") return;

  try {
    if (window.sessionStorage.getItem(STORAGE_KEY) !== null) return;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(readFromUrl()));
  } catch {
    /* Private browsing / blocked storage — attribution is simply omitted for this session. */
  }
}

/** Reads back whatever `captureAgencyAttributionOnLoad()` stored — `{}` if nothing was ever captured (or storage is unavailable). */
export function getStoredAgencyAttribution(): AgencyAttributionInput {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = agencyAttributionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}
