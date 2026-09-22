import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { sendContactNotification } from "@/lib/contact-notification";
import { connectToDatabase } from "@/lib/mongoose";
import { inquirySchema } from "@/lib/inquiry-schema";
import { Inquiry } from "@/lib/models/inquiry";
import { sendLeadEvent } from "@/lib/tracking/capi";
import {
  AGENCY_AD_CONSENT_COOKIE,
  AGENCY_REGION_COOKIE,
  isTrackingAllowed,
  readCookieHeaderValue,
} from "@/lib/tracking/consent";
import { getAgencyMetaCapiEnv } from "@/lib/tracking/env";

// Minimum time (ms) a real visitor needs to fill the form. Submissions
// faster than this are almost certainly scripted.
const MIN_FILL_TIME_MS = 2500;

// Simple per-IP throttle: at most this many inquiries within the window.
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 3;

// A resubmit of the same person/company within this window is almost
// always an accidental double-click or a retried request, not two distinct
// inquiries — treat it as idempotent rather than creating a duplicate
// document.
const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request body." },
      { status: 400 },
    );
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { ok: false, message: "Invalid request body." },
      { status: 400 },
    );
  }

  const record = body as Record<string, unknown>;

  // Honeypot: a field real users never see or fill. Any value means a bot.
  const honeypot = record.honeypot;
  const isHoneypotTripped =
    typeof honeypot === "string" ? honeypot.trim().length > 0 : false;

  // Timing check: forms submitted faster than a human can fill them out
  // are almost always automated.
  const startedAt = record.startedAt;
  const isTooFast =
    typeof startedAt === "number" &&
    Date.now() - startedAt < MIN_FILL_TIME_MS;

  if (isHoneypotTripped || isTooFast) {
    // Report success without persisting anything, so scripted submitters
    // get no signal that they were caught.
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const parsed = inquirySchema.safeParse(record);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] ??= issue.message;
    }
    return NextResponse.json(
      { ok: false, message: "Please fix the errors below.", fieldErrors },
      { status: 400 },
    );
  }

  const ipAddress = getClientIp(request);

  await connectToDatabase();

  if (ipAddress !== "unknown") {
    const recentCount = await Inquiry.countDocuments({
      ipAddress,
      createdAt: { $gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) },
    });
    if (recentCount >= RATE_LIMIT_MAX) {
      return NextResponse.json(
        {
          ok: false,
          message: "Too many submissions. Please try again later.",
        },
        { status: 429 },
      );
    }
  }

  const duplicate = await Inquiry.findOne({
    email: parsed.data.email.toLowerCase(),
    company: parsed.data.company,
    createdAt: { $gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
  });

  if (duplicate) {
    // Idempotent: report success without creating a second document.
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const created = await Inquiry.create({
    ...parsed.data,
    status: "NEW",
    ipAddress,
  });

  // Notification is best-effort and strictly after persistence: its failure
  // must never affect the response or the fact that the inquiry is safely
  // stored. Awaited (not fire-and-forget) so a failure is observed and
  // logged before the serverless invocation ends, but never rethrown.
  const notificationResult = await sendContactNotification({
    inquiryId: String(created._id),
    name: parsed.data.name,
    email: parsed.data.email,
    company: parsed.data.company,
    website: parsed.data.website,
    service: parsed.data.service,
    budgetRange: parsed.data.budgetRange,
    goals: parsed.data.goals,
    createdAt: created.createdAt,
  });

  if (!notificationResult.ok) {
    // Structured, non-sensitive diagnostic only: inquiry ID + error
    // classification. Never the visitor's name/email/message, the Resend
    // key, or a provider response body.
    console.error(
      JSON.stringify({
        event: "contact_notification_failed",
        inquiryId: String(created._id),
        errorCode: notificationResult.errorCode,
      }),
    );
  }

  // Meta CAPI "Lead" event — best-effort and strictly after persistence,
  // same contract as the notification above. Never reached for a
  // honeypot/timing-tripped, duplicate, or validation-failed submission,
  // since every one of those returns before this point. Gated on both
  // config (silently does nothing if AGENCY_META_PIXEL_ID/
  // AGENCY_META_CAPI_ACCESS_TOKEN are unset) and tracking consent (the
  // same obd_region/obd_ad_consent cookies TrackingGate itself reads
  // client-side — a missing obd_region cookie is treated as EEA/UK, the
  // safe default, so an unconsented visitor's CAPI Lead is never sent even
  // if the region cookie somehow never reached this request).
  const agencyCapiEnv = getAgencyMetaCapiEnv();
  if (agencyCapiEnv) {
    const cookieHeader = request.headers.get("cookie");
    const region = readCookieHeaderValue(cookieHeader, AGENCY_REGION_COOKIE);
    const consent = readCookieHeaderValue(cookieHeader, AGENCY_AD_CONSENT_COOKIE);

    if (isTrackingAllowed({ region, consent })) {
      const eventId =
        typeof record.eventId === "string" && record.eventId.trim().length > 0
          ? record.eventId.trim()
          : randomUUID();
      const eventSourceUrl =
        typeof record.eventSourceUrl === "string" && record.eventSourceUrl.trim().length > 0
          ? record.eventSourceUrl.trim()
          : (request.headers.get("referer") ?? "");

      // Wrapped in try/catch, unlike the notification call above —
      // sendLeadEvent's own contract is to never throw (see
      // src/lib/tracking/capi.ts), but this call is intentionally more
      // defensive than that: the explicit requirement is that a CAPI
      // failure can never affect this response, full stop, even if a
      // future change to sendLeadEvent ever broke that contract.
      try {
        const leadResult = await sendLeadEvent({
          pixelId: agencyCapiEnv.pixelId,
          accessToken: agencyCapiEnv.capiAccessToken,
          eventId,
          email: parsed.data.email,
          eventSourceUrl,
          clientIpAddress: ipAddress !== "unknown" ? ipAddress : null,
          clientUserAgent: request.headers.get("user-agent"),
          fbp: typeof record.fbp === "string" ? record.fbp : null,
          fbc: typeof record.fbc === "string" ? record.fbc : null,
        });

        if (!leadResult.ok) {
          // Same non-sensitive-diagnostic-only contract as
          // contact_notification_failed above.
          console.error(
            JSON.stringify({
              event: "agency_lead_capi_failed",
              inquiryId: String(created._id),
              errorCode: leadResult.errorCode,
            }),
          );
        }
      } catch {
        console.error(
          JSON.stringify({
            event: "agency_lead_capi_failed",
            inquiryId: String(created._id),
            errorCode: "UNEXPECTED_THROW",
          }),
        );
      }
    }
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
