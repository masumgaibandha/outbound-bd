import "server-only";

import { Resend } from "resend";

import { formatBDT } from "@/lib/masterclass/format";

/**
 * Server-only transactional email. `RESEND_API_KEY` is read lazily so
 * importing this file never throws in an environment where it isn't
 * configured — `sendConfirmationEmail()` reports `EMAIL_NOT_CONFIGURED`
 * instead. Ported from the MasumDev masterclass source (`RESEND_FROM_EMAIL`
 * only, no sender display name literal duplicated elsewhere).
 */

export type SendEmailResult = { ok: true } | { ok: false; errorCode: string };

export interface ConfirmationEmailInput {
  toEmail: string;
  studentName: string;
  registrationRef: string;
  amountBDT: number;
  method: "BKASH" | "NAGAD" | "ROCKET" | "BANK";
  classDateLabel: string;
}

const SENDER_DISPLAY_NAME = "Outbound BD";
const METHOD_LABEL: Record<ConfirmationEmailInput["method"], string> = {
  BKASH: "bKash",
  NAGAD: "Nagad",
  ROCKET: "Rocket",
  BANK: "Bank Transfer",
};

/** Every field interpolated into either email body is user-controlled or student-facing — always escaped before it reaches raw HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildEmailBody(input: ConfirmationEmailInput): { subject: string; html: string } {
  const subject = `রেজিস্ট্রেশন কনফার্ম হয়েছে — ${input.registrationRef}`;
  const studentName = escapeHtml(input.studentName);
  const registrationRef = escapeHtml(input.registrationRef);

  /* Deliberately excludes sender number and transaction ID — the student already knows both. */
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a1815;">
      <p>প্রিয় ${studentName},</p>
      <p>আপনার পেমেন্ট যাচাই সম্পন্ন হয়েছে এবং <strong>Lead Generation ও Cold Email Outreach মাস্টারক্লাস</strong>-এ আপনার রেজিস্ট্রেশন নিশ্চিত হয়েছে।</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 6px 0; color: #57534e;">রেজিস্ট্রেশন আইডি</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${registrationRef}</td></tr>
        <tr><td style="padding: 6px 0; color: #57534e;">পরিমাণ</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${formatBDT(input.amountBDT)}</td></tr>
        <tr><td style="padding: 6px 0; color: #57534e;">পেমেন্ট মাধ্যম</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${METHOD_LABEL[input.method]}</td></tr>
        <tr><td style="padding: 6px 0; color: #57534e;">ক্লাসের ধরন</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">২ দিনের LIVE মাস্টারক্লাস</td></tr>
        <tr><td style="padding: 6px 0; color: #57534e;">ক্লাসের তারিখ</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${input.classDateLabel}</td></tr>
      </table>
      <p>ক্লাসে যোগ দেওয়ার জন্য প্রয়োজনীয় live link ক্লাস শুরুর আগে এই ইমেইলেই আলাদাভাবে পাঠানো হবে।</p>
      <p>কোনো প্রশ্ন থাকলে সরাসরি এই ইমেইলে reply করুন অথবা hello@outboundbd.com-এ যোগাযোগ করুন।</p>
      <p>ধন্যবাদ,<br />Outbound BD</p>
    </div>
  `.trim();

  return { subject, html };
}

export interface RejectionEmailInput {
  toEmail: string;
  studentName: string;
  registrationRef: string;
  /** Used only for Resend's own idempotency key — never shown to the student. A registration can accumulate more than one rejected order over time (resubmission after a rejection opens a new order), so this must be the order's own ref, not the registration's. */
  idempotencyRef: string;
}

/**
 * Deliberately excludes any destination bank/mobile-payment number and any
 * transaction/reference ID the student submitted — this email tells them
 * verification failed and asks them to double-check their own records, not
 * to compare against details already only ever shown to them once.
 */
function buildRejectionEmailBody(input: RejectionEmailInput): { subject: string; html: string } {
  const subject = "আপনার পেমেন্ট যাচাই করা যায়নি — মাস্টার ক্লাস";
  const studentName = escapeHtml(input.studentName);
  const registrationRef = escapeHtml(input.registrationRef);

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a1815;">
      <p>প্রিয় ${studentName},</p>
      <p>দুঃখিত, আপনার জমা দেওয়া পেমেন্ট তথ্য আমরা যাচাই করতে পারিনি।</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 6px 0; color: #57534e;">রেজিস্ট্রেশন আইডি</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${registrationRef}</td></tr>
      </table>
      <p><strong>এই মুহূর্তে আপনার রেজিস্ট্রেশন এখনো কনফার্ম হয়নি।</strong></p>
      <p>অনুগ্রহ করে আপনার পাঠানো পেমেন্টের তথ্য (নম্বর ও Transaction/Reference ID) আরেকবার যাচাই করুন এবং এই ইমেইলেই সরাসরি reply করে আমাদের জানান, অথবা hello@outboundbd.com-এ যোগাযোগ করুন।</p>
      <p>ধন্যবাদ,<br />Outbound BD</p>
    </div>
  `.trim();

  return { subject, html };
}

/**
 * `RESEND_FROM_EMAIL` is meant to hold just the raw address — but a
 * pre-formatted `"Name <email>"` value is accepted too, so this never
 * constructs a broken, double-wrapped header. If the value contains
 * `<...>`, the email is extracted from inside the angle brackets;
 * otherwise the whole (trimmed) value is used as the email. Returns `null`
 * — never a fallback address — if unset.
 */
function getSenderEmail(): string | null {
  const raw = process.env.RESEND_FROM_EMAIL;
  if (!raw || raw.trim().length === 0) return null;

  const trimmed = raw.trim();
  const bracketed = /<([^<>]+)>/.exec(trimmed);
  const email = (bracketed ? bracketed[1] : trimmed).trim();
  return email.length > 0 ? email : null;
}

/** `RESEND_REPLY_TO_EMAIL` is optional — when unset, Reply-To falls back to the sender address. */
function getReplyToEmail(senderEmail: string): string {
  const raw = process.env.RESEND_REPLY_TO_EMAIL;
  if (!raw || raw.trim().length === 0) return senderEmail;

  const trimmed = raw.trim();
  const bracketed = /<([^<>]+)>/.exec(trimmed);
  const email = (bracketed ? bracketed[1] : trimmed).trim();
  return email.length > 0 ? email : senderEmail;
}

/**
 * Fails soft — every caller treats a non-`ok` result as "recorded, retry
 * later," never as a reason to undo the `PAID` transition that triggered
 * it. Two required configuration values gate every send: `RESEND_API_KEY`
 * and `RESEND_FROM_EMAIL`.
 */
export async function sendConfirmationEmail(input: ConfirmationEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, errorCode: "EMAIL_NOT_CONFIGURED" };
  }

  const senderEmail = getSenderEmail();
  if (!senderEmail) {
    return { ok: false, errorCode: "SENDER_NOT_CONFIGURED" };
  }

  const { subject, html } = buildEmailBody(input);
  const resend = new Resend(apiKey);

  try {
    const result = await resend.emails.send(
      {
        from: `${SENDER_DISPLAY_NAME} <${senderEmail}>`,
        replyTo: getReplyToEmail(senderEmail),
        to: input.toEmail,
        subject,
        html,
      },
      /*
       * Deterministic per registration — a manual "Retry" after a send that
       * actually succeeded but whose response was lost returns the
       * original result instead of delivering a second email.
       */
      { idempotencyKey: `masterclass-confirmation-${input.registrationRef}` },
    );

    if (result.error) {
      return { ok: false, errorCode: "PROVIDER_ERROR" };
    }
    return { ok: true };
  } catch {
    return { ok: false, errorCode: "NETWORK_ERROR" };
  }
}

/**
 * Best-effort, same as `sendConfirmationEmail()` — a failure here is
 * recorded (via `updateDeliveryState()` in the caller) and never rolls back
 * the `REJECTED` transition that triggered it. Reuses the exact same
 * server-only Resend configuration (`RESEND_API_KEY`/`RESEND_FROM_EMAIL`/
 * `RESEND_REPLY_TO_EMAIL`) and sender/reply-to resolution — never a second,
 * parallel email configuration.
 */
export async function sendRejectionEmail(input: RejectionEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, errorCode: "EMAIL_NOT_CONFIGURED" };
  }

  const senderEmail = getSenderEmail();
  if (!senderEmail) {
    return { ok: false, errorCode: "SENDER_NOT_CONFIGURED" };
  }

  const { subject, html } = buildRejectionEmailBody(input);
  const resend = new Resend(apiKey);

  try {
    const result = await resend.emails.send(
      {
        from: `${SENDER_DISPLAY_NAME} <${senderEmail}>`,
        replyTo: getReplyToEmail(senderEmail),
        to: input.toEmail,
        subject,
        html,
      },
      /* Deterministic per order — a retried "Retry email" click after a send that actually succeeded but whose response was lost returns the original result instead of delivering a second email. */
      { idempotencyKey: `masterclass-rejection-${input.idempotencyRef}` },
    );

    if (result.error) {
      return { ok: false, errorCode: "PROVIDER_ERROR" };
    }
    return { ok: true };
  } catch {
    return { ok: false, errorCode: "NETWORK_ERROR" };
  }
}
