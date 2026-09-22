import "server-only";

import { Resend } from "resend";

import { STRATEGY_CALL_HREF } from "@/components/public/site-config";

/**
 * Auto-reply sent to the prospect themselves after a successful
 * /agencies-lead submission — distinct from `contact-notification.ts`,
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
 */

const DEFAULT_AUTOREPLY_FROM = "Masum from Outbound BD <masum@updates.outboundbd.com>";

export type SendAgencyAutoReplyResult = { ok: true } | { ok: false; errorCode: string };

export interface AgencyAutoReplyInput {
  inquiryId: string;
  name: string;
  email: string;
}

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

function buildAutoReply(firstName: string): { subject: string; text: string } {
  const subject = `Got your details, ${firstName}`;
  const calendlyUrl = STRATEGY_CALL_HREF;

  const text = [
    `Hi ${firstName},`,
    "",
    "Thanks for reaching out about cold email for your agency.",
    "",
    "I'll look at your site and reply personally within one business day. If you'd rather talk it through sooner, you can book a time here:",
    calendlyUrl,
    "",
    "Masum",
    "Outbound BD",
  ].join("\n");

  return { subject, text };
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

  const { subject, text } = buildAutoReply(getFirstName(input.name));
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
