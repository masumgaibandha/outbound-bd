import "server-only";

import { Resend } from "resend";

import { CALENDLY_URL } from "@/components/public/site-config";

/**
 * Auto-reply sent to the prospect themselves after a successful
 * submission: the landing pages (/api/agencies-lead, /api/cold-email-lead)
 * use the "landing" variant, the /contact form (/api/inquiries) the
 * "contact" variant. Distinct from `contact-notification.ts`,
 * which is the INTERNAL notification sent to CONTACT_NOTIFICATION_EMAIL for
 * both forms (untouched by this file). Same lazy-env-check, never-throws
 * contract as that module: every failure path returns
 * `{ ok: false, errorCode }` so the caller can log a non-sensitive
 * diagnostic and still report the lead as saved. Copy is fixed, exact
 * wording from the round's own instructions — do not reword it here.
 *
 * Plain text only, deliberately no HTML part — unlike
 * `contact-notification.ts`'s internal notification, which stays HTML+text.
 *
 * Sent from its own address, independent of RESEND_FROM_EMAIL (the internal
 * notification's sender) — see `getAutoReplyFromAddress()` below.
 *
 * The booking link is `CALENDLY_URL` itself, never `STRATEGY_CALL_HREF`:
 * that one falls back to the relative "/contact", which is a broken link in
 * an email. If `CALENDLY_URL` is ever empty, the booking sentence and link
 * are left out of the email entirely and a non-sensitive diagnostic is
 * logged instead.
 */

const DEFAULT_AUTOREPLY_FROM = "Masum from Outbound BD <masum@updates.outboundbd.com>";

const DEFAULT_TOPIC = "your agency";

export type SendAgencyAutoReplyResult = { ok: true } | { ok: false; errorCode: string };

interface AutoReplyRecipient {
  inquiryId: string;
  name: string;
  email: string;
}

export type AgencyAutoReplyInput = AutoReplyRecipient &
  (
    | {
        variant?: "landing";
        /** Completes "Thanks for reaching out about cold email for ___." Defaults to "your agency" (the /agencies wording). */
        topic?: string;
      }
    | { variant: "contact" }
  );

/** The only lines that differ between variants; everything else in the email is shared. */
interface AutoReplyCopy {
  subject: (firstName: string) => string;
  thanksLine: string;
  replyLine: string;
}

// Exact wording from each round's own instructions. Do not reword here.
function getAutoReplyCopy(input: AgencyAutoReplyInput): AutoReplyCopy {
  if (input.variant === "contact") {
    return {
      subject: (firstName) => `Got your message, ${firstName}`,
      thanksLine: "Thanks for getting in touch about your project.",
      replyLine: "I'll read through what you sent and reply personally within one business day.",
    };
  }
  return {
    subject: (firstName) => `Got your details, ${firstName}`,
    thanksLine: `Thanks for reaching out about cold email for ${input.topic ?? DEFAULT_TOPIC}.`,
    replyLine: "I'll look at your site and reply personally within one business day.",
  };
}

const BOOKING_SENTENCE = "If you'd rather talk it through sooner, you can book a time here:";

function getFirstName(name: string): string {
  const trimmed = name.trim();
  const firstToken = trimmed.split(/\s+/)[0];
  return firstToken || trimmed;
}

/** `AGENCY_AUTOREPLY_FROM` is optional — unset (or blank) falls back to DEFAULT_AUTOREPLY_FROM, so this is never "not configured": there's always a valid from-address. */
function getAutoReplyFromAddress(): string {
  const raw = process.env.AGENCY_AUTOREPLY_FROM;
  return raw && raw.trim().length > 0 ? raw.trim() : DEFAULT_AUTOREPLY_FROM;
}

/** An empty `calendlyUrl` omits the booking sentence and link rather than pointing anywhere broken. */
function buildAutoReply(
  copy: AutoReplyCopy,
  firstName: string,
  calendlyUrl: string,
): { subject: string; text: string } {
  const bookingLines = calendlyUrl
    ? [`${copy.replyLine} ${BOOKING_SENTENCE}`, calendlyUrl]
    : [copy.replyLine];

  const text = [
    `Hi ${firstName},`,
    "",
    copy.thanksLine,
    "",
    ...bookingLines,
    "",
    "Masum",
    "Outbound BD",
  ].join("\n");

  return { subject: copy.subject(firstName), text };
}

export async function sendAgencyAutoReply(
  input: AgencyAutoReplyInput,
): Promise<SendAgencyAutoReplyResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, errorCode: "EMAIL_NOT_CONFIGURED" };
  }

  const fromAddress = getAutoReplyFromAddress();

  // Reply-to still comes from the shared RESEND_REPLY_TO_EMAIL — falls
  // back to this email's own from-address (not RESEND_FROM_EMAIL) when
  // unset, same never-omit-Reply-To contract as before.
  const replyToRaw = process.env.RESEND_REPLY_TO_EMAIL;
  const replyTo = replyToRaw && replyToRaw.trim().length > 0 ? replyToRaw.trim() : fromAddress;

  const calendlyUrl: string = CALENDLY_URL;
  if (!calendlyUrl) {
    // Non-sensitive diagnostic only: never the visitor's name or email.
    console.warn(
      JSON.stringify({
        event: "auto_reply_booking_link_missing",
        inquiryId: input.inquiryId,
      }),
    );
  }

  const { subject, text } = buildAutoReply(getAutoReplyCopy(input), getFirstName(input.name), calendlyUrl);
  const resend = new Resend(apiKey);

  try {
    const result = await resend.emails.send(
      {
        from: fromAddress,
        replyTo,
        to: input.email,
        subject,
        text,
      },
      // Deterministic per lead — a retried call for the same inquiry never
      // delivers a second auto-reply.
      { idempotencyKey: `agency-auto-reply-${input.inquiryId}` },
    );

    if (result.error) {
      return { ok: false, errorCode: "PROVIDER_ERROR" };
    }
    return { ok: true };
  } catch {
    return { ok: false, errorCode: "NETWORK_ERROR" };
  }
}
