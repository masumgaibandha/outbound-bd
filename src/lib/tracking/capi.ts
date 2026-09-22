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

export type MetaCapiResult = { ok: true } | { ok: false; errorCode: string };

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

  const payload = {
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

    if (!response.ok) {
      /* Never log the response body — it can echo back the request, including hashed PII and the access token context. */
      return { ok: false, errorCode: `HTTP_${response.status}` };
    }

    return { ok: true };
  } catch (error) {
    const errorCode = error instanceof Error && error.name === "AbortError" ? "TIMEOUT" : "NETWORK_ERROR";
    return { ok: false, errorCode };
  } finally {
    clearTimeout(timeout);
  }
}
