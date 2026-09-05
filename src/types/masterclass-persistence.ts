import type { ObjectId } from "mongodb";

/**
 * MongoDB document shapes for the masterclass funnel. Kept separate from
 * `src/types/masterclass.ts` (UI-content types) so a database schema change
 * is never mistaken for a copy change. Ported verbatim from the MasumDev
 * masterclass source (read-only reference) — no structural changes.
 */

export type RegistrationStatus = "PENDING_PAYMENT" | "ENROLLED" | "CANCELLED";

/**
 * `PENDING` — order created, no manual payment submitted yet.
 * `REVIEW` — student submitted sender number + transaction ID; awaiting manual verification.
 * `PAID` — an operator manually verified the money was actually received. Only
 * `verifyPayment()` in `payment-orders-repository.ts` may set this.
 * `REJECTED` — a submitted transaction could not be verified.
 * `FAILED`/`REFUNDED` — reserved for a future real gateway and refund policy;
 * unused by the Batch 1 manual flow.
 */
export type PaymentOrderStatus =
  | "PENDING"
  | "REVIEW"
  | "PAID"
  | "REJECTED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";

/** `UNASSIGNED` until a payment method is chosen. `MANUAL` is the only one used in Batch 1. */
export type PaymentProvider = "UNASSIGNED" | "MANUAL" | "SSLCOMMERZ" | "BKASH";

/** Which manual channel a `MANUAL`-provider order was paid through. */
export type ManualPaymentMethod = "BKASH" | "NAGAD" | "ROCKET" | "BANK";

/**
 * Whitelisted attribution only — never an arbitrary object. `capturedAt` is
 * server-set, not client-submitted, so it can't be backdated or forged.
 */
export interface AttributionSnapshot {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  fbclid?: string;
  fbp?: string;
  fbc?: string;
  landingPage?: string;
  referrer?: string;
  capturedAt: Date;
}

export type DeliveryStatus = "NOT_READY" | "READY" | "PROCESSING" | "SENT" | "FAILED";

/** Shared shape for both async delivery side effects (`confirmationEmail`, `purchaseCapi`) on a payment order. */
export interface DeliveryState {
  status: DeliveryStatus;
  attempts: number;
  processingToken: string | null;
  processingStartedAt: Date | null;
  leaseExpiresAt: Date | null;
  lastAttemptAt: Date | null;
  sentAt: Date | null;
  /** Short allowlisted code only (e.g. "PROVIDER_TIMEOUT") — never a raw exception message. */
  lastErrorCode: string | null;
}

/**
 * Evidence of what a student agreed to and exactly which version of each
 * document was in effect at that moment. `privacyPolicyVersion`,
 * `termsVersion`, and `refundPolicyVersion` are always stamped from
 * `policyVersions` in `constants.ts` at write time — never accepted from
 * the client, and never rewritten by a later retry.
 */
export interface ConsentRecord {
  /** Always `true` — a registration document is only ever created after `termsAccepted === true` was explicitly submitted. */
  accepted: true;
  privacyPolicyVersion: string;
  termsVersion: string;
  refundPolicyVersion: string;
  acceptedAt: Date;
  /** Always a separate, explicit opt-in, independent of `accepted`. Defaults to false, never true by inference. */
  marketingConsent: boolean;
}

/**
 * One document per student per batch — `(batchId, emailNormalized)` is
 * unique. A retried or repeated submission updates this document rather
 * than creating a duplicate; `firstTouchAttribution` never changes after
 * the first write, `lastTouchAttribution` does.
 */
export interface RegistrationDocument {
  _id?: ObjectId;
  /** Human-friendly, sequential identifier (`MC-2026-000123`), shown to the student and the admin queue. Not a bearer capability (it's sequential/guessable) — the payment-submission route is keyed by the order's opaque `ord_<uuid>` ref instead. */
  publicRegistrationRef: string;
  masterclassSlug: string;
  batchId: string;
  name: string;
  email: string;
  emailNormalized: string;
  phone: string;
  /** Normalized to +8801XXXXXXXXX. */
  phoneE164: string;
  status: RegistrationStatus;
  consent: ConsentRecord;
  firstTouchAttribution: AttributionSnapshot;
  lastTouchAttribution: AttributionSnapshot;
  /**
   * Set exactly once, at the moment this registration's order is approved
   * (`REVIEW → PAID`) — absent on every document created before this field
   * existed, and absent forever on a registration whose order is never
   * approved. A plain optional field is safe to read directly (`undefined`
   * simply means "not linked yet"), unlike `rejectionEmail` below, which
   * needs a whole default *object* on absence and so gets its own
   * `getRejectionEmailState()` accessor.
   */
  studentId?: ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Evidence submitted by the student for a manual (bKash/Nagad/Rocket/bank
 * transfer) payment. Never auto-verified — submitting this only moves an
 * order to `REVIEW`. `senderNumber` is populated for the three mobile-wallet
 * methods and `null` for `BANK`; `payerName`/`senderBankName` are the reverse
 * (set only for `BANK`) — see `manualPaymentInputSchema` in `validation.ts`
 * for the discriminated-by-`method` shape that produces this.
 */
export interface ManualPaymentSubmission {
  senderNumber: string | null;
  /** BANK only: the name on the sending bank account. */
  payerName?: string | null;
  /** BANK only, optional: the student's own bank, if they chose to share it. */
  senderBankName?: string | null;
  transactionIdRaw: string;
  /** Trimmed + uppercased — the form uniqueness is enforced on this, across every manual method. */
  transactionIdNormalized: string;
  submittedAt: Date;
}

/**
 * One document per checkout/payment attempt. Never trust `status` alone as
 * proof of payment — only a verified provider response (or, for Batch 1, an
 * operator via `verifyPayment()`) may ever set it to `PAID`.
 */
export interface PaymentOrderDocument {
  _id?: ObjectId;
  /** Public, unguessable identifier — the `_id` is never exposed outside the database layer. */
  publicOrderRef: string;
  registrationId: ObjectId;
  masterclassSlug: string;
  batchId: string;
  /** The price actually charged at order-creation time — never recomputed later. */
  amount: number;
  currency: string;
  status: PaymentOrderStatus;
  provider: PaymentProvider;
  method: ManualPaymentMethod | null;
  manualPayment: ManualPaymentSubmission | null;
  /** Client-supplied UUID (the `Idempotency-Key` header) — a repeat within the same batch returns the existing order, but only if `requestFingerprint` also matches. */
  idempotencyKey: string;
  /** SHA-256 of the canonical (batchId, registrationId, amount, currency) tuple. A key reused for a different request is a conflict, not a replay. */
  requestFingerprint: string;
  providerTransactionId: string | null;
  providerPaymentId: string | null;
  attribution: AttributionSnapshot;
  /** Server-derived only — never taken from the request body. Used for Meta CAPI. */
  clientContext: {
    clientIpAddress: string | null;
    clientUserAgent: string | null;
  };
  metaEventIds: {
    initiateCheckout: string | null;
    purchase: string;
  };
  confirmationEmail: DeliveryState;
  purchaseCapi: DeliveryState;
  /** Sent only on `REVIEW → REJECTED` (never for PAID orders). Same best-effort semantics as `confirmationEmail` — a failed send never reverts `status`. */
  rejectionEmail: DeliveryState;
  verifiedAt: Date | null;
  /** Opaque operator identifier (the Basic Auth username) — never a display name, never emailed. */
  verifiedBy: string | null;
  rejectedReason: string | null;
  /**
   * Present (always `true`) exactly while `status` is PENDING, REVIEW, or
   * PAID; absent (`$unset`) once REJECTED/FAILED/CANCELLED. Not itself a
   * business field — `status` is still the single source of truth — this
   * exists only so a MongoDB partial unique index can enforce "at most one
   * active-or-paid order per registration", since partial-index filter
   * expressions don't support `$in`/`$or` against a `status` field with
   * more than one matching value (see `payment-orders-repository.ts`).
   * Any future code path that transitions an order to FAILED or CANCELLED
   * must also `$unset` this field.
   */
  activeOrderLock?: true;
  /** Same semantics as `RegistrationDocument.studentId` — set exactly once, at approval, on the order that was actually approved. */
  studentId?: ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export type StudentStatus = "ACTIVE" | "MERGED" | "ARCHIVED";

/**
 * One permanent record per real person, deduplicated by `emailNormalized`
 * across every batch and (eventually) every program — created only at the
 * moment a payment is first successfully approved (never at registration,
 * never for a rejected/pending registration). `publicStudentId` is
 * display/search only, never authentication — the same discipline already
 * documented on `publicRegistrationRef`.
 */
export interface StudentDocument {
  _id?: ObjectId;
  publicStudentId: string;
  /** Most recently approved name — the registration's own snapshot stays immutable regardless of later updates here. */
  name: string;
  email: string;
  /** Primary, permanent deduplication key. Never changes after creation in Phase 1 (no self-service email change exists). */
  emailNormalized: string;
  /** Most recently approved phone. Deliberately not unique — a phone can legitimately belong to more than one student. */
  phone: string;
  phoneE164: string;
  status: StudentStatus;
  /** Set only when `status === "MERGED"` — future manual-merge tooling, not built in Phase 1. */
  mergedIntoStudentId: ObjectId | null;
  /** Timestamp of the first successful approval that created this record. Immutable after creation. */
  firstEnrolledAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
