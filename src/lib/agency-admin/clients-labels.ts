import type { ClientPlan, ClientStatus } from "@/lib/models/client";
import type { PaymentMethod, PaymentType } from "@/lib/models/payment";

/** Human-readable labels for the client/payment enums, used by both the `/admin/clients` + `/admin/payments` UI and their CSV exports so the two always agree. */

export const CLIENT_PLAN_LABELS: Record<ClientPlan, string> = {
  LAUNCH: "Launch",
  GROWTH: "Growth",
  SCALE: "Scale",
  CUSTOM: "Custom",
};

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  ACTIVE: "Active",
  PAUSED: "Paused",
  ENDED: "Ended",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  WISE: "Wise",
  PAYONEER: "Payoneer",
  BANK: "Bank transfer",
  STRIPE: "Stripe",
  OTHER: "Other",
};

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  SETUP: "Setup",
  MONTHLY: "Monthly",
  OTHER: "Other",
};
