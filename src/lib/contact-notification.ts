import "server-only";

import { Resend } from "resend";

import { ACTIVE_CLIENTS_OPTIONS, AGENCY_NEED_OPTIONS } from "@/lib/agency-inquiry-schema";
import { BUDGET_RANGE_OPTIONS, SERVICE_INTEREST_OPTIONS } from "@/lib/inquiry-schema";
import type { InquirySource } from "@/lib/models/inquiry";

/**
 * Internal "new lead" notification - sent to CONTACT_NOTIFICATION_EMAIL
 * after an Inquiry document is already persisted, from EITHER form
 * (`source` says which - see `src/lib/models/inquiry.ts`). Every env var is
 * read lazily, only when sendContactNotification() is actually called, so
 * importing this module (and therefore either API route that calls it)
 * never throws in an environment where notification isn't configured -
 * same lazy-validation contract as src/lib/env.ts and
 * src/lib/masterclass/email.ts. Never throws: every failure path returns
 * { ok: false, errorCode } so a caller can log a non-sensitive diagnostic
 * and still report the inquiry as saved.
 */

export type SendContactNotificationResult = { ok: true } | { ok: false; errorCode: string };

export interface ContactNotificationInput {
  inquiryId: string;
  source: InquirySource;
  name: string;
  email: string;
  website: string;
  /** Raw `budgetRange` slug as stored on the Inquiry document - resolved to its label here. */
  budgetRange: string;
  createdAt: Date;
  /** Contact-form only. */
  company?: string;
  /** Contact-form only - raw `service` slug, resolved to its label here. */
  service?: string;
  /** Contact-form only. */
  goals?: string;
  /** Agencies-landing only - raw slug, resolved to its label here. */
  activeClients?: string;
  /** Agencies-landing only - raw slug, resolved to its label here. */
  need?: string;
}

const SOURCE_LABELS: Record<InquirySource, string> = {
  contact: "Contact form",
  "agencies-landing": "Agencies landing page",
};

const SERVICE_LABELS = new Map<string, string>(
  SERVICE_INTEREST_OPTIONS.map((option) => [option.value, option.label]),
);
const BUDGET_LABELS = new Map<string, string>(
  BUDGET_RANGE_OPTIONS.map((option) => [option.value, option.label]),
);
const ACTIVE_CLIENTS_LABELS = new Map<string, string>(
  ACTIVE_CLIENTS_OPTIONS.map((option) => [option.value, option.label]),
);
const AGENCY_NEED_LABELS = new Map<string, string>(
  AGENCY_NEED_OPTIONS.map((option) => [option.value, option.label]),
);

/** Never renders undefined/null/empty as literal text - falls back to an explicit placeholder. */
function displayValue(value: string | undefined | null): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "(not provided)";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Strips CR/LF and other control characters before a visitor-controlled
 * value is used anywhere header-like (the email subject, or Reply-To) - a
 * defense-in-depth measure independent of upstream validation, since this
 * function has no way to know whether its caller already validated the
 * input. Walks code points rather than a control-character regex range, to
 * keep the intent obvious at every character.
 */
function sanitizeForHeader(value: string): string {
  let result = "";
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    const isCrOrLf = code === 13 || code === 10;
    const isOtherControl = code < 32 || code === 127;
    if (isCrOrLf) {
      result += " ";
    } else if (!isOtherControl) {
      result += ch;
    }
  }
  return result.replace(/\s+/g, " ").trim();
}

function formatSubmittedAt(date: Date): string {
  const formatted = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(date);
  return `${formatted} (Asia/Dhaka)`;
}

interface NotificationRow {
  label: string;
  value: string;
}

function buildRows(input: ContactNotificationInput): NotificationRow[] {
  const rows: NotificationRow[] = [
    { label: "Source", value: SOURCE_LABELS[input.source] },
    { label: "Name", value: displayValue(input.name) },
    { label: "Email", value: displayValue(input.email) },
  ];

  if (input.company !== undefined) {
    rows.push({ label: "Company", value: displayValue(input.company) });
  }

  rows.push({ label: "Website", value: displayValue(input.website) });

  if (input.service !== undefined) {
    rows.push({
      label: "Requested service",
      value: displayValue(SERVICE_LABELS.get(input.service) ?? input.service),
    });
  }
  if (input.activeClients !== undefined) {
    rows.push({
      label: "Active clients",
      value: displayValue(ACTIVE_CLIENTS_LABELS.get(input.activeClients) ?? input.activeClients),
    });
  }
  if (input.need !== undefined) {
    rows.push({
      label: "What they need",
      value: displayValue(AGENCY_NEED_LABELS.get(input.need) ?? input.need),
    });
  }

  rows.push({ label: "Budget", value: displayValue(BUDGET_LABELS.get(input.budgetRange) ?? input.budgetRange) });

  if (input.goals !== undefined) {
    rows.push({ label: "Goals", value: displayValue(input.goals) });
  }

  rows.push(
    { label: "Submitted", value: formatSubmittedAt(input.createdAt) },
    { label: "Inquiry ID", value: input.inquiryId },
  );

  return rows;
}

function buildEmailBody(input: ContactNotificationInput): { subject: string; html: string; text: string } {
  const subject = sanitizeForHeader(
    input.source === "agencies-landing"
      ? `New agencies landing lead - ${displayValue(input.name)}`
      : `New contact inquiry - ${displayValue(input.name)} (${displayValue(input.company)})`,
  );

  const rows = buildRows(input);
  const introText = `A new ${SOURCE_LABELS[input.source].toLowerCase()} lead was just saved.`;

  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1a1815;">
      <p>${escapeHtml(introText)}</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        ${rows
          .map(
            (row) =>
              `<tr><td style="padding: 6px 12px 6px 0; color: #57534e; vertical-align: top; white-space: nowrap;">${escapeHtml(row.label)}</td><td style="padding: 6px 0; font-weight: 600; white-space: pre-wrap;">${escapeHtml(row.value)}</td></tr>`,
          )
          .join("")}
      </table>
      <p style="color: #57534e; font-size: 13px;">Reply directly to this email to respond to the lead.</p>
    </div>
  `.trim();

  const text = [
    introText,
    "",
    ...rows.map((row) => `${row.label}: ${row.value}`),
    "",
    "Reply directly to this email to respond to the lead.",
  ].join("\n");

  return { subject, html, text };
}

export async function sendContactNotification(
  input: ContactNotificationInput,
): Promise<SendContactNotificationResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, errorCode: "EMAIL_NOT_CONFIGURED" };
  }

  const fromAddress = process.env.RESEND_FROM_EMAIL;
  if (!fromAddress || fromAddress.trim().length === 0) {
    return { ok: false, errorCode: "SENDER_NOT_CONFIGURED" };
  }

  const recipient = process.env.CONTACT_NOTIFICATION_EMAIL;
  if (!recipient || recipient.trim().length === 0) {
    return { ok: false, errorCode: "CONTACT_NOTIFICATION_NOT_CONFIGURED" };
  }

  const { subject, html, text } = buildEmailBody(input);
  const resend = new Resend(apiKey);

  try {
    const result = await resend.emails.send(
      {
        from: fromAddress.trim(),
        replyTo: sanitizeForHeader(input.email),
        to: recipient.trim(),
        subject,
        html,
        text,
      },
      // Deterministic per inquiry - a retried call for the same inquiry
      // (e.g. this function invoked twice for the same document) never
      // delivers a second notification.
      { idempotencyKey: `contact-inquiry-${input.inquiryId}` },
    );

    if (result.error) {
      return { ok: false, errorCode: "PROVIDER_ERROR" };
    }
    return { ok: true };
  } catch {
    return { ok: false, errorCode: "NETWORK_ERROR" };
  }
}
