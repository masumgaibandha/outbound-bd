import "server-only";

import { Resend } from "resend";

import { STRATEGY_CALL_HREF } from "@/components/public/site-config";

/**
 * Auto-reply sent to the prospect themselves after a successful
 * /agencies-lead submission — distinct from `contact-notification.ts`,
 * which is the INTERNAL notification sent to CONTACT_NOTIFICATION_EMAIL for
 * both forms. Same lazy-env-check, never-throws contract as that module:
 * every failure path returns `{ ok: false, errorCode }` so the caller can
 * log a non-sensitive diagnostic and still report the lead as saved. Copy
 * is fixed, exact wording from the round's own instructions — do not
 * reword it here.
 */

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildAutoReply(firstName: string): { subject: string; html: string; text: string } {
  const subject = `Got your details, ${firstName}`;
  const calendlyUrl = STRATEGY_CALL_HREF;

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a1815;">
      <p>Hi ${escapeHtml(firstName)},</p>
      <p>Thanks for reaching out about cold email for your agency.</p>
      <p>
        I&rsquo;ll look at your site and reply personally within one business day.
        If you&rsquo;d rather talk it through sooner, you can book a time here:<br />
        <a href="${escapeHtml(calendlyUrl)}">${escapeHtml(calendlyUrl)}</a>
      </p>
      <p>Masum<br />Outbound BD</p>
    </div>
  `.trim();

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

  return { subject, html, text };
}

export async function sendAgencyAutoReply(
  input: AgencyAutoReplyInput,
): Promise<SendAgencyAutoReplyResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, errorCode: "EMAIL_NOT_CONFIGURED" };
  }

  const fromAddress = process.env.RESEND_FROM_EMAIL;
  if (!fromAddress || fromAddress.trim().length === 0) {
    return { ok: false, errorCode: "SENDER_NOT_CONFIGURED" };
  }

  const replyToRaw = process.env.RESEND_REPLY_TO_EMAIL;
  const replyTo =
    replyToRaw && replyToRaw.trim().length > 0 ? replyToRaw.trim() : fromAddress.trim();

  const { subject, html, text } = buildAutoReply(getFirstName(input.name));
  const resend = new Resend(apiKey);

  try {
    const result = await resend.emails.send(
      {
        from: fromAddress.trim(),
        replyTo,
        to: input.email,
        subject,
        html,
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
