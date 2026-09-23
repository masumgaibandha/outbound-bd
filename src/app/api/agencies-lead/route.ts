import type { HydratedDocument } from "mongoose";
import { NextResponse } from "next/server";

import { agencyAttributionSchema, agencyInquirySchema } from "@/lib/agency-inquiry-schema";
import { sendAgencyAutoReply } from "@/lib/agency-auto-reply";
import { sendContactNotification } from "@/lib/contact-notification";
import {
  dispatchAgencyLeadCapi,
  getBotSubmissionSkipReason,
  getClientIp,
  isRateLimited,
  logLeadSubmissionSkipped,
} from "@/lib/inquiry-submission";
import { Inquiry, type InquiryDocument } from "@/lib/models/inquiry";
import { connectToDatabase } from "@/lib/mongoose";

// A resubmit of the same email within this window is almost always an
// accidental double-click or a retried request, not two distinct leads —
// treat it as idempotent rather than creating a duplicate document. Scoped
// to this source: an agencies-landing lead has no "company" field to key on
// the way /api/inquiries's duplicate check does.
const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;

const ROUTE = "/api/agencies-lead";

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

  const botSkipReason = getBotSubmissionSkipReason(record);
  if (botSkipReason) {
    // Report success without persisting anything, so scripted submitters
    // get no signal that they were caught — but log the reason, since this
    // is otherwise the only trace a real visitor caught by a false
    // positive (e.g. browser-autofilled honeypot) ever leaves.
    logLeadSubmissionSkipped(ROUTE, botSkipReason);
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const parsed = agencyInquirySchema.safeParse(record);
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

  // Best-effort, defense-in-depth revalidation of the client-supplied
  // first-touch attribution (see src/lib/agency-attribution.ts) — a
  // malformed/oversized value is dropped, never treated as a submission
  // failure.
  const attributionParsed = agencyAttributionSchema.safeParse(record.attribution);
  const attribution = attributionParsed.success ? attributionParsed.data : undefined;

  const ipAddress = getClientIp(request);

  // Every database operation for this submission lives in this one block —
  // same fix as /api/inquiries: a failure here returns a friendly JSON 500
  // and logs a non-sensitive diagnostic instead of an unhandled throw.
  let created: HydratedDocument<InquiryDocument>;
  try {
    await connectToDatabase();

    if (await isRateLimited(ipAddress)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Too many submissions. Please try again later.",
        },
        { status: 429 },
      );
    }

    const duplicate = await Inquiry.findOne({
      email: parsed.data.email.toLowerCase(),
      source: "agencies-landing",
      createdAt: { $gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
    });

    if (duplicate) {
      // Idempotent: report success without creating a second document.
      logLeadSubmissionSkipped(ROUTE, "duplicate");
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    created = await Inquiry.create({
      ...parsed.data,
      attribution,
      source: "agencies-landing",
      status: "NEW",
      ipAddress,
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "inquiry_persist_failed",
        errorCode: error instanceof Error ? error.name : "UNKNOWN",
      }),
    );
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Please try again shortly." },
      { status: 500 },
    );
  }

  // Internal notification, labeled with the source — best-effort and
  // strictly after persistence, same contract as /api/inquiries.
  const notificationResult = await sendContactNotification({
    inquiryId: String(created._id),
    source: "agencies-landing",
    name: parsed.data.name,
    email: parsed.data.email,
    website: parsed.data.website,
    activeClients: parsed.data.activeClients,
    need: parsed.data.need,
    budgetRange: parsed.data.budgetRange,
    createdAt: created.createdAt,
  });

  if (!notificationResult.ok) {
    console.error(
      JSON.stringify({
        event: "contact_notification_failed",
        inquiryId: String(created._id),
        errorCode: notificationResult.errorCode,
      }),
    );
  }

  // Auto-reply to the prospect — best-effort, never affects this response.
  const autoReplyResult = await sendAgencyAutoReply({
    inquiryId: String(created._id),
    name: parsed.data.name,
    email: parsed.data.email,
  });

  if (!autoReplyResult.ok) {
    // Same non-sensitive-diagnostic-only contract as every other
    // best-effort failure log in this route — never the visitor's name or
    // email.
    console.error(
      JSON.stringify({
        event: "agency_auto_reply_failed",
        inquiryId: String(created._id),
        errorCode: autoReplyResult.errorCode,
      }),
    );
  }

  // Meta CAPI "Lead" event — best-effort and strictly after persistence.
  await dispatchAgencyLeadCapi({
    request,
    record,
    email: parsed.data.email,
    ipAddress,
    inquiryId: String(created._id),
    source: "agencies-landing",
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
