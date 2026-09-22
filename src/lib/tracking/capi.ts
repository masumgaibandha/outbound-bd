import "server-only";

import { createHash } from "node:crypto";

/**
 * Server-only Meta Conversions API sender for the agency dataset. Adapted
 * from `src/lib/masterclass/meta-capi.ts`'s `sendPurchaseEvent` (same
 * hashing rule, same timeout/error-classification shape), generalized to
 * the "Lead" event and kept independent of the `Inquiry` document shape so
 * Round 2's second form (a new /agencies landing page) can call this same
 * helper with its own email/eventSourceUrl.
 */

const GRAPH_API_VERSION = "v21.0";
const REQUEST_TIMEOUT_MS = 8000;

function sha256Lower(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export type MetaCapiResult =
  | { ok: true; eventsReceived: number }
  | { ok: false; errorCode: string; metaErrorCode?: number; metaErrorSubcode?: number };

export interface SendLeadEventInput {
  pixelId: string;
  accessToken: string;
  /** Same value the browser used for its `fbq('track','Lead', ..., {eventID})` call — Meta dedupes the two by this. */
  eventId: string;
  email: string;
  eventSourceUrl: string;
  clientIpAddress: string | null;
  clientUserAgent: string | null;
  fbp: string | null;
  fbc: string | null;
  /** Routes this event into Meta Events Manager's Test Events tool instead of real traffic — see AgencyMetaCapiEnv's doc comment. Omitted from the payload entirely when unset. */
  testEventCode?: string;
}

/** `response.json()` can itself throw (non-JSON body) — every caller of this treats that as "no further detail available", never a reason to throw further. */
async function parseJsonBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/** Meta's documented Graph API error shape: `{ error: { message, type, code, error_subcode, fbtrace_id } }`. Only the two numeric codes are ever extracted — `message` can echo back request content and must never be logged. */
function extractMetaErrorCodes(body: unknown): { metaErrorCode?: number; metaErrorSubcode?: number } {
  if (typeof body !== "object" || body === null || !("error" in body)) return {};
  const error = (body as { error?: unknown }).error;
  if (typeof error !== "object" || error === null) return {};
  const { code, error_subcode: errorSubcode } = error as { code?: unknown; error_subcode?: unknown };
  return {
    metaErrorCode: typeof code === "number" ? code : undefined,
    metaErrorSubcode: typeof errorSubcode === "number" ? errorSubcode : undefined,
  };
}

/** Meta's documented success shape includes `events_received` — defaults to 0 if the body is missing it or isn't shaped as expected, rather than throwing. */
function extractEventsReceived(body: unknown): number {
  if (typeof body !== "object" || body === null || !("events_received" in body)) return 0;
  const eventsReceived = (body as { events_received?: unknown }).events_received;
  return typeof eventsReceived === "number" ? eventsReceived : 0;
}

export async function sendLeadEvent(input: SendLeadEventInput): Promise<MetaCapiResult> {
  const userData: Record<string, unknown> = {
    em: [sha256Lower(input.email)],
    client_ip_address: input.clientIpAddress ?? undefined,
    client_user_agent: input.clientUserAgent ?? undefined,
    /* fbp/fbc are click/browser identifiers, not PII — sent as-is per Meta's spec, never hashed. */
    fbp: input.fbp ?? undefined,
    fbc: input.fbc ?? undefined,
  };

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        action_source: "website",
        event_source_url: input.eventSourceUrl,
        user_data: userData,
      },
    ],
  };
  if (input.testEventCode) {
    payload.test_event_code = input.testEventCode;
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${input.pixelId}/events?access_token=${encodeURIComponent(input.accessToken)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const body = await parseJsonBody(response);

    if (!response.ok) {
      /* Never log the full response body — it can echo back the request, including hashed PII and the access token context. Only the two numeric error codes below are ever surfaced to the caller. */
      return { ok: false, errorCode: `HTTP_${response.status}`, ...extractMetaErrorCodes(body) };
    }

    return { ok: true, eventsReceived: extractEventsReceived(body) };
  } catch (error) {
    const errorCode = error instanceof Error && error.name === "AbortError" ? "TIMEOUT" : "NETWORK_ERROR";
    return { ok: false, errorCode };
  } finally {
    clearTimeout(timeout);
  }
}
