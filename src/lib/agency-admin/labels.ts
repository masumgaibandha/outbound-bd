import {
  ACTIVE_CLIENTS_OPTIONS,
  AGENCY_NEED_OPTIONS,
} from "@/lib/agency-inquiry-schema";
import { COLD_EMAIL_NEED_OPTIONS, TEAM_SIZE_OPTIONS } from "@/lib/cold-email-inquiry-schema";
import {
  BUDGET_RANGE_OPTIONS,
  OUTREACH_VOLUME_OPTIONS,
  SERVICE_INTEREST_OPTIONS,
} from "@/lib/inquiry-schema";
import type { InquirySource, InquiryStatus } from "@/lib/models/inquiry";

/**
 * Human-readable labels for every enum-ish field stored on an Inquiry, used
 * by both the `/admin/leads` UI and the CSV export so the two always agree.
 * Reuses the same option lists the public forms already validate against
 * (`inquiry-schema.ts` / `agency-inquiry-schema.ts`) rather than duplicating
 * them — a raw, unrecognized stored value (e.g. a pre-Round-2 budget slug)
 * always falls back to the raw string, never throws.
 */

export const STATUS_LABELS: Record<InquiryStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  CALL_BOOKED: "Call booked",
  PROPOSAL_SENT: "Proposal sent",
  WON: "Won",
  LOST: "Lost",
};

export const STATUS_VALUES: InquiryStatus[] = [
  "NEW",
  "CONTACTED",
  "CALL_BOOKED",
  "PROPOSAL_SENT",
  "WON",
  "LOST",
];

export const SOURCE_LABELS: Record<InquirySource, string> = {
  contact: "Contact form",
  "agencies-landing": "Agencies landing page",
  "cold-email-landing": "Cold email landing page",
};

export const SOURCE_VALUES: InquirySource[] = ["contact", "agencies-landing", "cold-email-landing"];

const SERVICE_LABELS = new Map<string, string>(
  SERVICE_INTEREST_OPTIONS.map((option) => [option.value, option.label]),
);
const BUDGET_LABELS = new Map<string, string>(
  BUDGET_RANGE_OPTIONS.map((option) => [option.value, option.label]),
);
const OUTREACH_VOLUME_LABELS = new Map<string, string>(
  OUTREACH_VOLUME_OPTIONS.map((option) => [option.value, option.label]),
);
const ACTIVE_CLIENTS_LABELS = new Map<string, string>(
  ACTIVE_CLIENTS_OPTIONS.map((option) => [option.value, option.label]),
);
const AGENCY_NEED_LABELS = new Map<string, string>(
  AGENCY_NEED_OPTIONS.map((option) => [option.value, option.label]),
);

function labelOrRaw(map: Map<string, string>, value: string | undefined): string {
  if (!value) return "";
  return map.get(value) ?? value;
}

export function serviceLabel(value: string | undefined): string {
  return labelOrRaw(SERVICE_LABELS, value);
}

export function budgetLabel(value: string | undefined): string {
  return labelOrRaw(BUDGET_LABELS, value);
}

export function outreachVolumeLabel(value: string | undefined): string {
  return labelOrRaw(OUTREACH_VOLUME_LABELS, value);
}

export function activeClientsLabel(value: string | undefined): string {
  return labelOrRaw(ACTIVE_CLIENTS_LABELS, value);
}

export function agencyNeedLabel(value: string | undefined): string {
  return labelOrRaw(AGENCY_NEED_LABELS, value);
}

const TEAM_SIZE_LABELS = new Map<string, string>(
  TEAM_SIZE_OPTIONS.map((option) => [option.value, option.label]),
);
const COLD_EMAIL_NEED_LABELS = new Map<string, string>(
  COLD_EMAIL_NEED_OPTIONS.map((option) => [option.value, option.label]),
);

export function teamSizeLabel(value: string | undefined): string {
  return labelOrRaw(TEAM_SIZE_LABELS, value);
}

/** A landing-page lead's `need`, labeled from its own form's option list. */
export function needLabel(source: InquirySource, value: string | undefined): string {
  return labelOrRaw(source === "cold-email-landing" ? COLD_EMAIL_NEED_LABELS : AGENCY_NEED_LABELS, value);
}

/** "Service or need" column: the contact form's `service`, or a landing-page form's `need` — the two never coexist on one document. */
export function serviceOrNeedLabel(source: InquirySource, service?: string, need?: string): string {
  return source === "contact" ? serviceLabel(service) : needLabel(source, need);
}
