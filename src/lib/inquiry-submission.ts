import "server-only";

import { randomUUID } from "node:crypto";

import { Inquiry, type InquirySource } from "@/lib/models/inquiry";
import { sendLeadEvent } from "@/lib/tracking/capi";
import {
  AGENCY_AD_CONSENT_COOKIE,
  AGENCY_REGION_COOKIE,
  categorizeRegionCookie,
  readCookieHeaderValue,
} from "@/lib/tracking/consent";
import { getAgencyMetaCapiEnv } from "@/lib/tracking/env";

/**
 * Shared between `/api/inquiries` (the /contact form) and
 * `/api/agencies-lead` (the /agencies landing form) — both need the same
 * honeypot/timing check, the same per-IP rate limit, and the same
 * best-effort Meta CAPI Lead dispatch. Everything here operates on the
 * shared `Inquiry` collection/model (both sources live in one collection —
 * see `src/lib/models/inquiry.ts`), never anything source-specific like the
 * duplicate-window query, which stays in each route (contact keys on
 * email+company, agencies-landing has no company to key on).
 */

// Minimum time (ms) a real visitor needs to fill a form. Submissions faster
// than this are almost certainly scripted. Lowered from 2500 to 1500 —
// autofill (browser or password manager) legitimately fills a whole form in
// under 2 seconds, and 2500 was clipping real, autofilled humans.
const MIN_FILL_TIME_MS = 1500;

// Simple per-IP throttle: at most this many inquiries within the window,
// shared across both forms' submissions (same collection, same counter) —
// a scripted attacker doesn't get a separate budget per form.
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 3;

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

/** Why a submission was silently skipped — see `logLeadSubmissionSkipped()` below. `"duplicate"` is added by each route itself (not detected here). */
export type LeadSubmissionSkipReason = "honeypot" | "too_fast" | "duplicate";

/**
 * `null` if the submission looks human. Otherwise the specific reason, so
 * the caller can log which one — previously this only returned a boolean,
 * which meant a real visitor silently dropped by a browser-autofilled
 * honeypot field was indistinguishable from an actual bot in any log, and a
 * whole class of lost leads (Round 4B's incident) was invisible. See
 * `logLeadSubmissionSkipped()`.
 */
export function getBotSubmissionSkipReason(
  record: Record<string, unknown>,
): "honeypot" | "too_fast" | null {
  const honeypot = record.honeypot;
  const isHoneypotTripped =
    typeof honeypot === "string" ? honeypot.trim().length > 0 : false;
  if (isHoneypotTripped) return "honeypot";

  const startedAt = record.startedAt;
  const isTooFast =
    typeof startedAt === "number" &&
    Date.now() - startedAt < MIN_FILL_TIME_MS;
  if (isTooFast) return "too_fast";

  return null;
}

/**
 * The one structured log line for every silent skip (honeypot, too-fast, or
 * a same-email duplicate within the window) — each of these returns a
 * normal-looking `{ ok: true }` / 201 to the caller by design (so a
 * scripted bot gets no signal it was caught), which means this log line is
 * the ONLY place such a skip is ever visible. Deliberately non-sensitive:
 * `route` and `reason` only, never the submitter's name, email, or any
 * other field.
 */
export function logLeadSubmissionSkipped(
  route: string,
  reason: LeadSubmissionSkipReason,
): void {
  console.log(JSON.stringify({ event: "lead_submission_skipped", route, reason }));
}

/** Requires an already-open database connection — call after `connectToDatabase()`. */
export async function isRateLimited(ipAddress: string): Promise<boolean> {
  if (ipAddress === "unknown") return false;
  const recentCount = await Inquiry.countDocuments({
    ipAddress,
    createdAt: { $gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) },
  });
  return recentCount >= RATE_LIMIT_MAX;
}

export interface DispatchLeadCapiInput {
  request: Request;
  /** The raw parsed request body — read for the client-supplied eventId/eventSourceUrl/fbp/fbc, same convention as honeypot/startedAt (not part of the strict Zod schema). */
  record: Record<string, unknown>;
  email: string;
  ipAddress: string;
  inquiryId: string;
  source: InquirySource;
}

type CapiSkipReason = "missing_config" | "no_consent" | "region_unknown";

/**
 * Booleans/categorized values only — never a raw cookie value — so this is
 * safe to include in every observability log line below. Exists to answer
 * one specific diagnostic question: did the obd_region/obd_ad_consent
 * cookies actually reach this request, or did they never arrive at all
 * (proxy.ts not running, cookie blocked, a direct API call bypassing it)?
 * That's a materially different situation from "cookie arrived, visitor
 * correctly hasn't consented yet" — `regionValue: "missing"` singles out
 * the former.
 */
interface CookieDiagnostics {
  hasRegionCookie: boolean;
  regionValue: ReturnType<typeof categorizeRegionCookie>;
  hasConsentCookie: boolean;
}

function readCookieDiagnostics(request: Request): {
  region: string | undefined;
  consent: string | undefined;
  diagnostics: CookieDiagnostics;
} {
  const cookieHeader = request.headers.get("cookie");
  const region = readCookieHeaderValue(cookieHeader, AGENCY_REGION_COOKIE);
  const consent = readCookieHeaderValue(cookieHeader, AGENCY_AD_CONSENT_COOKIE);
  return {
    region,
    consent,
    diagnostics: {
      hasRegionCookie: region !== undefined,
      regionValue: categorizeRegionCookie(region),
      hasConsentCookie: consent !== undefined,
    },
  };
}

/**
 * Best-effort Meta CAPI "Lead" event — never throws, never affects the
 * caller's response. Logs exactly one structured line per attempt (never
 * more than one, and never PII/secrets — no email, no hash, no token, no
 * cookie value): `agency_lead_capi_sent` on success, `_skipped` when this
 * deliberately does nothing (config/region/consent), or `_failed` when
 * Meta itself rejects the call or the request errors. Call strictly after
 * the Inquiry document is already persisted.
 */
export async function dispatchAgencyLeadCapi({
  request,
  record,
  email,
  ipAddress,
  inquiryId,
  source,
}: DispatchLeadCapiInput): Promise<void> {
  const { consent, diagnostics } = readCookieDiagnostics(request);

  function skip(reason: CapiSkipReason) {
    console.log(
      JSON.stringify({ event: "agency_lead_capi_skipped", inquiryId, source, reason, ...diagnostics }),
    );
  }

  const agencyCapiEnv = getAgencyMetaCapiEnv();
  if (!agencyCapiEnv) {
    skip("missing_config");
    return;
  }

  // Same allow/deny semantics as isTrackingAllowed() (see consent.ts), just
  // decomposed so the two distinct "not allowed" cases below can be
  // reported separately instead of collapsed into one boolean.
  if (diagnostics.regionValue !== "other") {
    if (diagnostics.regionValue === "missing") {
      skip("region_unknown");
      return;
    }
    if (consent !== "granted") {
      skip("no_consent");
      return;
    }
  }

  const eventId =
    typeof record.eventId === "string" && record.eventId.trim().length > 0
      ? record.eventId.trim()
      : randomUUID();
  const eventSourceUrl =
    typeof record.eventSourceUrl === "string" && record.eventSourceUrl.trim().length > 0
      ? record.eventSourceUrl.trim()
      : (request.headers.get("referer") ?? "");

  // Wrapped in try/catch even though sendLeadEvent's own contract is to
  // never throw (see src/lib/tracking/capi.ts) — this call is intentionally
  // more defensive than that contract alone: a CAPI failure must never
  // affect the caller's response, full stop, even if a future change to
  // sendLeadEvent ever broke that contract.
  try {
    const leadResult = await sendLeadEvent({
      pixelId: agencyCapiEnv.pixelId,
      accessToken: agencyCapiEnv.capiAccessToken,
      eventId,
      email,
      eventSourceUrl,
      clientIpAddress: ipAddress !== "unknown" ? ipAddress : null,
      clientUserAgent: request.headers.get("user-agent"),
      fbp: typeof record.fbp === "string" ? record.fbp : null,
      fbc: typeof record.fbc === "string" ? record.fbc : null,
      testEventCode: agencyCapiEnv.testEventCode,
    });

    if (leadResult.ok) {
      console.log(
        JSON.stringify({
          event: "agency_lead_capi_sent",
          inquiryId,
          source,
          eventsReceived: leadResult.eventsReceived,
          ...diagnostics,
        }),
      );
    } else {
      // Structured, non-sensitive diagnostic only: inquiry ID + error
      // classification + Meta's two numeric error codes. Never the
      // visitor's name/email, a token, or Meta's error message body (which
      // can echo back request content).
      console.error(
        JSON.stringify({
          event: "agency_lead_capi_failed",
          inquiryId,
          source,
          errorCode: leadResult.errorCode,
          metaErrorCode: leadResult.metaErrorCode,
          metaErrorSubcode: leadResult.metaErrorSubcode,
          ...diagnostics,
        }),
      );
    }
  } catch {
    console.error(
      JSON.stringify({
        event: "agency_lead_capi_failed",
        inquiryId,
        source,
        errorCode: "UNEXPECTED_THROW",
        ...diagnostics,
      }),
    );
  }
}
