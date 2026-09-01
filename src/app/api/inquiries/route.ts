import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/mongoose";
import { inquirySchema } from "@/lib/inquiry-schema";
import { Inquiry } from "@/lib/models/inquiry";

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

  await Inquiry.create({
    ...parsed.data,
    status: "NEW",
    ipAddress,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
