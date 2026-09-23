import type { HydratedDocument } from "mongoose";
import { NextResponse } from "next/server";

import { sendContactNotification } from "@/lib/contact-notification";
import { connectToDatabase } from "@/lib/mongoose";
import { inquirySchema } from "@/lib/inquiry-schema";
import {
  dispatchAgencyLeadCapi,
  getBotSubmissionSkipReason,
  getClientIp,
  isRateLimited,
  logLeadSubmissionSkipped,
} from "@/lib/inquiry-submission";
import { Inquiry, type InquiryDocument } from "@/lib/models/inquiry";

// A resubmit of the same person/company within this window is almost
// always an accidental double-click or a retried request, not two distinct
// inquiries — treat it as idempotent rather than creating a duplicate
// document.
const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;

const ROUTE = "/api/inquiries";

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

  // Every database operation for this submission lives in this one block.
  // A failure here (e.g. a misconfigured MONGODB_URI) previously propagated
  // as an unhandled throw — Next's default error handler then returned a
  // non-JSON 500 body, which the client-side form couldn't parse, so it
  // fell back to a generic "Something went wrong" with no diagnostic in
  // between. Catching it here instead returns a friendly JSON message and
  // logs a non-sensitive diagnostic (error name only — never a connection
  // string, stack trace, or visitor data).
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
      company: parsed.data.company,
      createdAt: { $gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
    });

    if (duplicate) {
      // Idempotent: report success without creating a second document.
      logLeadSubmissionSkipped(ROUTE, "duplicate");
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    created = await Inquiry.create({
      ...parsed.data,
      source: "contact",
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

  // Notification is best-effort and strictly after persistence: its failure
  // must never affect the response or the fact that the inquiry is safely
  // stored. Awaited (not fire-and-forget) so a failure is observed and
  // logged before the serverless invocation ends, but never rethrown.
  const notificationResult = await sendContactNotification({
    inquiryId: String(created._id),
    source: "contact",
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

  // Meta CAPI "Lead" event — best-effort and strictly after persistence.
  // Never reached for a honeypot/timing-tripped, duplicate, or
  // validation-failed submission, since every one of those returns before
  // this point.
  await dispatchAgencyLeadCapi({
    request,
    record,
    email: parsed.data.email,
    ipAddress,
    inquiryId: String(created._id),
    source: "contact",
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
