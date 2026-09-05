"use client";

import { toast } from "@heroui/react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { CheckIcon, CircleAlertIcon, CircleCheckIcon, CopyIcon } from "@/components/public/icons";
import { numericTextClass } from "@/components/masterclass/MasterclassSection";
import {
  TurnstileWidget,
  type TurnstileWidgetHandle,
} from "@/components/masterclass/TurnstileWidget";
import { legalPageLinks } from "@/data/legal-content";
import { paymentMethods as paymentMethodCopy, registration, registrationForm } from "@/data/masterclass-content";
import type { ManualPaymentEnv } from "@/lib/masterclass/env";
import { formatBDT } from "@/lib/masterclass/format";
import {
  attributionInputSchema,
  manualPaymentInputSchema,
  normalizeBangladeshPhone,
  registrationInputSchema,
} from "@/lib/masterclass/validation";
import type { ManualPaymentMethod } from "@/types/masterclass-persistence";

/*
 * Ported from the MasumDev masterclass source with two deliberate additions
 * (marked below): the honeypot + `startedAt` fields the server's schema
 * (`registrationInputSchema` in `src/lib/masterclass/validation.ts`) and
 * API route (`src/app/api/masterclass/registrations/route.ts`) already
 * expect and silently gate on, but the source's own client form never
 * collected or sent — the source never had a server-side honeypot/timing
 * check at all. Wired here using this repo's own `/api/inquiries` contact
 * form convention (`src/components/public/contact-form.tsx`): a visually
 * hidden text field named `company_phone`, and a `startedAt` timestamp
 * captured once on mount via a ref set inside a `useEffect`.
 */

/*
 * Mirrors the server schema's caps (src/lib/masterclass/validation.ts) — not
 * importable as constants from there today, so duplicated here as two plain
 * numbers, not validation *logic*. The server remains authoritative; this
 * only avoids sending an oversized field the server would reject anyway.
 */
const MAX_ATTRIBUTION_FIELD_LENGTH = 512;
const MAX_URL_FIELD_LENGTH = 2048;

const fieldClass =
  "border-hairline bg-canvas text-ink placeholder:text-ink-muted/70 focus-visible:border-ink focus-visible:outline-action w-full rounded-lg border px-4 py-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60";
const labelClass = "text-ink font-bengali block text-sm font-medium";
const legalLinkClass =
  "text-ink decoration-action hover:text-action focus-visible:outline-action rounded-sm font-medium underline decoration-2 underline-offset-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";
const checkboxClass =
  "border-hairline text-action focus-visible:outline-action mt-0.5 size-4 shrink-0 rounded disabled:cursor-not-allowed disabled:opacity-60";
const errorTextClass = "text-ink font-bengali mt-1.5 text-xs font-medium";
const primaryButtonClass =
  "bg-action hover:bg-action-hover focus-visible:outline-action font-bengali inline-flex h-13 w-full items-center justify-center gap-2 rounded-full px-7 text-[0.95rem] font-medium text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-ink/40 disabled:hover:bg-ink/40";

interface RegistrationFields {
  name: string;
  email: string;
  phone: string;
  policyAccepted: boolean;
  marketingConsent: boolean;
}

const EMPTY_REGISTRATION_FIELDS: RegistrationFields = {
  name: "",
  email: "",
  phone: "",
  policyAccepted: false,
  marketingConsent: false,
};

type Step = "register" | "payment" | "pending";

interface RegisteredOrder {
  publicRegistrationRef: string;
  publicOrderRef: string;
}

interface RegistrationApiSuccess {
  publicRegistrationRef: string;
  publicOrderRef: string;
  status: string;
}

interface PaymentApiSuccess {
  publicOrderRef: string;
  status: string;
}

interface ApiError {
  error: string;
  fields?: { field: string; message: string }[];
}

function readCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function captureAttribution() {
  if (typeof window === "undefined") return undefined;

  const params = new URLSearchParams(window.location.search);
  const raw: Record<string, string> = {};

  const utmMap: Record<string, string> = {
    utm_source: "utmSource",
    utm_medium: "utmMedium",
    utm_campaign: "utmCampaign",
    utm_content: "utmContent",
    utm_term: "utmTerm",
  };
  for (const [param, key] of Object.entries(utmMap)) {
    const value = params.get(param);
    if (value) raw[key] = value.slice(0, MAX_ATTRIBUTION_FIELD_LENGTH);
  }

  const fbclid = params.get("fbclid");
  if (fbclid) raw.fbclid = fbclid.slice(0, MAX_ATTRIBUTION_FIELD_LENGTH);

  /* Set by the Meta Pixel base script once it's live — read here rather than duplicating Meta's own cookie logic. */
  const fbp = readCookie("_fbp");
  if (fbp) raw.fbp = fbp.slice(0, MAX_ATTRIBUTION_FIELD_LENGTH);
  const fbc = readCookie("_fbc");
  if (fbc) raw.fbc = fbc.slice(0, MAX_ATTRIBUTION_FIELD_LENGTH);

  if (window.location.href) {
    raw.landingPage = window.location.href.slice(0, MAX_URL_FIELD_LENGTH);
  }
  if (document.referrer) {
    raw.referrer = document.referrer.slice(0, MAX_URL_FIELD_LENGTH);
  }

  if (Object.keys(raw).length === 0) return undefined;

  const parsed = attributionInputSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

function fieldsSnapshot(fields: RegistrationFields): string {
  return JSON.stringify(fields);
}

interface MasterclassRegistrationFormProps {
  siteKey: string;
  priceBDT: number;
  paymentMethods: ManualPaymentEnv;
}

/**
 * Three-step interactive registration form. Only ever mounted by
 * `Registration.tsx` when `formEnabled` is true. Steps:
 *
 * 1. `register` — name/email/phone/consent + Turnstile → creates the
 *    registration and a PENDING order. Fires `InitiateCheckout` on success
 *    (genuine start of payment, never on a generic CTA click).
 * 2. `payment` — choose bKash/Nagad/Rocket, see the account number + exact
 *    amount, submit sender number + transaction ID → moves the order to
 *    REVIEW. No browser Purchase event fires here or anywhere else in this
 *    codebase — see `src/lib/masterclass/meta-capi.ts` for why Purchase is
 *    CAPI-only, fired server-side only after an operator approves.
 * 3. `pending` — "payment submitted, being verified" — never "registration
 *    confirmed."
 */
export function MasterclassRegistrationForm({ siteKey, priceBDT, paymentMethods }: MasterclassRegistrationFormProps) {
  const formId = useId();
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);

  const [step, setStep] = useState<Step>("register");
  const [order, setOrder] = useState<RegisteredOrder | null>(null);

  /* --- Step 1: registration --- */
  const [fields, setFields] = useState<RegistrationFields>(EMPTY_REGISTRATION_FIELDS);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [registerStatus, setRegisterStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const idempotencyKeySnapshotRef = useRef<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const policyAcceptedRef = useRef<HTMLInputElement>(null);
  /* Anti-automation additions — not present in the MasumDev source form. */
  const honeypotRef = useRef<HTMLInputElement>(null);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  /* --- Step 2: payment method + evidence --- */
  const [method, setMethod] = useState<ManualPaymentMethod | null>(null);
  const [senderNumber, setSenderNumber] = useState("");
  /* Bank-transfer only. */
  const [payerName, setPayerName] = useState("");
  const [senderBankName, setSenderBankName] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>({});
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "submitting">("idle");
  const [copied, setCopied] = useState(false);

  const fieldId = (name: string) => `${formId}-${name}`;
  const errorId = (name: string) => `${formId}-${name}-error`;

  function updateField<K extends keyof RegistrationFields>(key: K, value: RegistrationFields[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function resetTurnstileForRetry() {
    setTurnstileToken(null);
    turnstileRef.current?.reset();
  }

  function focusFirstInvalid(errors: Record<string, string>) {
    if (errors.name) nameRef.current?.focus();
    else if (errors.email) emailRef.current?.focus();
    else if (errors.phone) phoneRef.current?.focus();
    else if (errors.policyAccepted) policyAcceptedRef.current?.focus();
  }

  async function onSubmitRegistration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (registerStatus === "submitting") return; // prevent double submission

    setFormError(null);

    const phoneE164 = normalizeBangladeshPhone(fields.phone);
    const parsed = registrationInputSchema.safeParse({
      name: fields.name,
      email: fields.email,
      phone: fields.phone,
      termsAccepted: fields.policyAccepted ? true : undefined,
      marketingConsent: fields.marketingConsent,
      turnstileToken: turnstileToken ?? "",
      attribution: captureAttribution(),
      honeypot: honeypotRef.current?.value ?? "",
      startedAt: startedAtRef.current ?? Date.now(),
    });

    if (!parsed.success || !phoneE164) {
      const nextErrors: Record<string, string> = {};
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0]);
          nextErrors[key] ??= issue.message;
        }
      }
      if (nextErrors.name) nextErrors.name = registrationForm.nameError;
      if (nextErrors.email) nextErrors.email = registrationForm.emailError;
      if (nextErrors.phone || !phoneE164) nextErrors.phone = registrationForm.phoneError;
      if (nextErrors.termsAccepted) nextErrors.policyAccepted = registrationForm.consentError;
      if (nextErrors.turnstileToken) nextErrors.turnstileToken = registrationForm.turnstileMissingError;

      setFieldErrors(nextErrors);
      setFormError(registrationForm.errorSummaryHeading);
      setRegisterStatus("error");
      focusFirstInvalid(nextErrors);
      return;
    }

    setFieldErrors({});

    const snapshot = fieldsSnapshot(fields);
    if (idempotencyKeyRef.current === null || idempotencyKeySnapshotRef.current !== snapshot) {
      idempotencyKeyRef.current = crypto.randomUUID();
      idempotencyKeySnapshotRef.current = snapshot;
    }

    setRegisterStatus("submitting");

    try {
      const response = await fetch("/api/masterclass/registrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKeyRef.current,
        },
        body: JSON.stringify(parsed.data),
      });

      let body: RegistrationApiSuccess | ApiError | null = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (response.status === 201 && body && "publicRegistrationRef" in body) {
        setOrder({ publicRegistrationRef: body.publicRegistrationRef, publicOrderRef: body.publicOrderRef });
        /* Genuine start of the payment process — not fired on a generic CTA click. */
        (window as { fbq?: (...args: unknown[]) => void }).fbq?.("track", "InitiateCheckout", {
          currency: "BDT",
          value: priceBDT,
        });
        setStep("payment");
        return;
      }

      const errorBody = body as ApiError | null;
      const errorCode: string = errorBody?.error ?? "UNKNOWN";

      if (errorCode === "VALIDATION_ERROR" && errorBody?.fields) {
        const nextErrors: Record<string, string> = {};
        for (const f of errorBody.fields) {
          nextErrors[f.field] ??= registrationForm.genericError;
        }
        setFieldErrors(nextErrors);
        setFormError(registrationForm.errorSummaryHeading);
      } else if (errorCode === "IDEMPOTENCY_CONFLICT") {
        idempotencyKeyRef.current = null;
        idempotencyKeySnapshotRef.current = null;
        setFormError(registrationForm.idempotencyConflictError);
      } else if (errorCode === "REGISTRATION_CONFLICT") {
        setFormError(registrationForm.registrationConflictError);
      } else if (response.status === 429) {
        const retryAfterHeader = response.headers.get("Retry-After");
        const seconds = Number.parseInt(retryAfterHeader ?? "", 10);
        const secondsLabel = Number.isFinite(seconds) && seconds > 0 ? String(seconds) : "কিছুক্ষণ";
        setFormError(`${registrationForm.rateLimitedPrefix} ${secondsLabel} ${registrationForm.rateLimitedSuffix}`);
      } else if (response.status === 503) {
        setFormError(registrationForm.unavailableError);
      } else {
        setFormError(registrationForm.genericError);
      }

      setRegisterStatus("error");
      resetTurnstileForRetry();
    } catch {
      setFormError(registrationForm.networkError);
      setRegisterStatus("error");
      resetTurnstileForRetry();
    }
  }

  /* --- Step 2 handlers --- */

  async function copyNumber(number: string) {
    try {
      await navigator.clipboard.writeText(number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard API can fail (permissions, insecure context) — the number is still visible to copy by hand. */
    }
  }

  async function onSubmitPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (paymentStatus === "submitting" || !order) return;

    setPaymentError(null);

    const rawPayload =
      method === "BANK"
        ? { method, payerName, senderBankName, transactionId }
        : { method: method ?? undefined, senderNumber, transactionId };

    const parsed = manualPaymentInputSchema.safeParse(rawPayload);

    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        nextErrors[key] ??= issue.message;
      }
      if (nextErrors.method) nextErrors.method = registrationForm.paymentMethodError;
      if (nextErrors.senderNumber) nextErrors.senderNumber = registrationForm.senderNumberError;
      if (nextErrors.payerName) nextErrors.payerName = registrationForm.payerNameError;
      if (nextErrors.transactionId) nextErrors.transactionId = registrationForm.transactionIdError;
      setPaymentErrors(nextErrors);
      setPaymentError(registrationForm.errorSummaryHeading);
      return;
    }

    setPaymentErrors({});
    setPaymentStatus("submitting");

    try {
      const response = await fetch(`/api/masterclass/registrations/${order.publicOrderRef}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      let body: PaymentApiSuccess | ApiError | null = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (response.status === 200 && body && "publicOrderRef" in body) {
        /* Fired only after the API confirms the submission is persisted — never optimistically. */
        toast.success(registrationForm.paymentSuccessToast);
        setStep("pending");
        return;
      }

      const errorBody = body as ApiError | null;
      const errorCode: string = errorBody?.error ?? "UNKNOWN";

      if (errorCode === "VALIDATION_ERROR" && errorBody?.fields) {
        const nextErrors: Record<string, string> = {};
        for (const f of errorBody.fields) nextErrors[f.field] ??= registrationForm.genericError;
        setPaymentErrors(nextErrors);
        setPaymentError(registrationForm.errorSummaryHeading);
      } else if (errorCode === "DUPLICATE_TRANSACTION_ID") {
        setPaymentError(registrationForm.duplicateTransactionError);
      } else if (errorCode === "ORDER_NOT_EDITABLE") {
        setPaymentError(registrationForm.orderNotEditableError);
      } else if (response.status === 429) {
        const retryAfterHeader = response.headers.get("Retry-After");
        const seconds = Number.parseInt(retryAfterHeader ?? "", 10);
        const secondsLabel = Number.isFinite(seconds) && seconds > 0 ? String(seconds) : "কিছুক্ষণ";
        setPaymentError(`${registrationForm.rateLimitedPrefix} ${secondsLabel} ${registrationForm.rateLimitedSuffix}`);
      } else if (response.status === 503) {
        setPaymentError(registrationForm.unavailableError);
      } else {
        setPaymentError(registrationForm.genericError);
      }
      /* One concise toast for every non-success outcome — the inline messages above stay specific (field errors, duplicate TxID, rate limit, ...); this is a supplementary, generic signal that never leaks a raw server error or stack trace. */
      toast.danger(registrationForm.paymentErrorToast);
      setPaymentStatus("idle");
    } catch {
      setPaymentError(registrationForm.networkError);
      toast.danger(registrationForm.paymentErrorToast);
      setPaymentStatus("idle");
    }
  }

  /* --- Render --- */

  if (step === "pending") {
    return (
      <div role="status" className="border-hairline bg-surface flex h-full flex-col items-start justify-center border p-6 md:p-8">
        <CircleCheckIcon className="text-action size-8" aria-hidden="true" />
        <h3 className="font-heading text-ink font-bengali mt-5 text-xl tracking-tight">
          {registrationForm.pendingHeading}
        </h3>
        {order ? (
          <p className="text-ink-muted font-bengali mt-2 text-sm">
            {registrationForm.pendingRegistrationRefLabel}: <span className={`${numericTextClass} text-ink font-medium`}>{order.publicRegistrationRef}</span>
          </p>
        ) : null}
        <p className="text-ink-muted font-bengali mt-3 leading-relaxed">{registrationForm.pendingBody}</p>
      </div>
    );
  }

  if (step === "payment" && order) {
    /*
     * Inlined rather than imported from `@/lib/masterclass/env` (which
     * mirrors this exact same order via `listEnabledManualPaymentMethods()`,
     * tested there directly): that module is `import "server-only"`-guarded,
     * and this is a Client Component — importing a value (not just a type)
     * from it would break the client bundle. `paymentMethods` itself is
     * already the resolved, server-computed `ManualPaymentEnv` passed down
     * as a prop, so no server-only code needs to run here.
     */
    const availableMethods: ManualPaymentMethod[] = [];
    if (paymentMethods.bkash.enabled) availableMethods.push("BKASH");
    if (paymentMethods.nagad.enabled) availableMethods.push("NAGAD");
    if (paymentMethods.rocket.enabled) availableMethods.push("ROCKET");
    if (paymentMethods.bank.enabled) availableMethods.push("BANK");

    const selectedNumber =
      method && method !== "BANK"
        ? paymentMethods[method.toLowerCase() as "bkash" | "nagad" | "rocket"].number
        : null;
    const bankEnv = method === "BANK" ? paymentMethods.bank : null;

    return (
      <form
        noValidate
        onSubmit={onSubmitPayment}
        aria-busy={paymentStatus === "submitting"}
        className="border-hairline bg-surface border p-6 md:p-8"
      >
        <h3 className="font-heading text-ink font-bengali text-xl tracking-tight">
          {registrationForm.paymentStepHeading}
        </h3>
        <p className="text-ink-muted font-bengali mt-2 text-sm leading-relaxed">
          {registrationForm.paymentStepDescription}
        </p>

        {availableMethods.length === 0 ? (
          <p className="text-ink font-bengali border-hairline bg-canvas mt-6 border p-4 text-sm">
            {registrationForm.unavailableError}
          </p>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {availableMethods.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMethod(key)}
                  className={`border-hairline font-bengali rounded-lg border px-3 py-3 text-sm font-medium transition-colors ${
                    method === key ? "border-action bg-action/10 text-action" : "text-ink hover:border-action"
                  }`}
                  aria-pressed={method === key}
                >
                  {paymentMethodCopy[key].label}
                </button>
              ))}
            </div>
            {paymentErrors.method ? <p className={errorTextClass}>{paymentErrors.method}</p> : null}

            {method && selectedNumber ? (
              <div className="border-hairline bg-canvas mt-5 space-y-4 border p-4">
                <p className="text-ink-muted font-bengali text-sm leading-relaxed">
                  {paymentMethodCopy[method].instructions}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-ink-muted font-bengali text-xs">{registrationForm.accountNumberLabel}</p>
                    <p className={`${numericTextClass} text-ink mt-0.5 text-lg whitespace-nowrap`}>{selectedNumber}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyNumber(selectedNumber)}
                    className="border-hairline text-ink hover:border-action hover:text-action font-bengali inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors"
                  >
                    {copied ? <CheckIcon className="size-4" aria-hidden="true" /> : <CopyIcon className="size-4" aria-hidden="true" />}
                    {copied ? registrationForm.copiedLabel : registrationForm.copyLabel}
                  </button>
                </div>
                <div className="border-hairline border-t pt-3">
                  <p className="text-ink-muted font-bengali text-xs">{registrationForm.amountLabel}</p>
                  <p className={`${numericTextClass} text-ink mt-0.5 text-lg`}>{formatBDT(priceBDT)}</p>
                </div>
              </div>
            ) : null}

            {bankEnv?.enabled ? (
              <div className="border-hairline bg-canvas mt-5 space-y-4 border p-4">
                <p className="text-ink-muted font-bengali text-sm leading-relaxed">
                  {paymentMethodCopy.BANK.instructions}
                </p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <dt className="text-ink-muted font-bengali text-xs">{registrationForm.bankNameLabel}</dt>
                    <dd className="text-ink font-medium">{bankEnv.bankName}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted font-bengali text-xs">{registrationForm.bankAccountNameLabel}</dt>
                    <dd className="text-ink font-medium">{bankEnv.accountName}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted font-bengali text-xs">{registrationForm.bankBranchLabel}</dt>
                    <dd className="text-ink font-medium">{bankEnv.branch}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted font-bengali text-xs">{registrationForm.bankRoutingNumberLabel}</dt>
                    <dd className={`${numericTextClass} text-ink font-medium`}>{bankEnv.routingNumber}</dd>
                  </div>
                </dl>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-3">
                  <div className="min-w-0">
                    <p className="text-ink-muted font-bengali text-xs">{registrationForm.bankAccountNumberLabel}</p>
                    <p className={`${numericTextClass} text-ink mt-0.5 text-lg break-words`}>{bankEnv.accountNumber}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => bankEnv.accountNumber && copyNumber(bankEnv.accountNumber)}
                    className="border-hairline text-ink hover:border-action hover:text-action font-bengali inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors"
                  >
                    {copied ? <CheckIcon className="size-4" aria-hidden="true" /> : <CopyIcon className="size-4" aria-hidden="true" />}
                    {copied ? registrationForm.copiedLabel : registrationForm.copyLabel}
                  </button>
                </div>
                <div className="border-hairline border-t pt-3">
                  <p className="text-ink-muted font-bengali text-xs">{registrationForm.amountLabel}</p>
                  <p className={`${numericTextClass} text-ink mt-0.5 text-lg`}>{formatBDT(priceBDT)}</p>
                </div>
              </div>
            ) : null}

            {method === "BANK" ? (
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor={fieldId("payer-name")} className={labelClass}>
                    {registrationForm.payerNameLabel}
                  </label>
                  <input
                    id={fieldId("payer-name")}
                    type="text"
                    required
                    placeholder={registrationForm.payerNamePlaceholder}
                    disabled={paymentStatus === "submitting"}
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    aria-invalid={Boolean(paymentErrors.payerName)}
                    aria-describedby={paymentErrors.payerName ? errorId("payer-name") : undefined}
                    className={`${fieldClass} mt-2`}
                  />
                  {paymentErrors.payerName ? (
                    <p id={errorId("payer-name")} className={errorTextClass}>
                      {paymentErrors.payerName}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label htmlFor={fieldId("sender-bank-name")} className={labelClass}>
                    {registrationForm.senderBankNameLabel}
                  </label>
                  <input
                    id={fieldId("sender-bank-name")}
                    type="text"
                    placeholder={registrationForm.senderBankNamePlaceholder}
                    disabled={paymentStatus === "submitting"}
                    value={senderBankName}
                    onChange={(e) => setSenderBankName(e.target.value)}
                    className={`${fieldClass} mt-2`}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor={fieldId("transaction-id")} className={labelClass}>
                    {registrationForm.transactionIdBankLabel}
                  </label>
                  <input
                    id={fieldId("transaction-id")}
                    type="text"
                    required
                    placeholder={registrationForm.transactionIdPlaceholder}
                    disabled={paymentStatus === "submitting"}
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    aria-invalid={Boolean(paymentErrors.transactionId)}
                    aria-describedby={paymentErrors.transactionId ? errorId("transaction-id") : undefined}
                    className={`${fieldClass} mt-2`}
                  />
                  {paymentErrors.transactionId ? (
                    <p id={errorId("transaction-id")} className={errorTextClass}>
                      {paymentErrors.transactionId}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor={fieldId("sender-number")} className={labelClass}>
                    {registrationForm.senderNumberLabel}
                  </label>
                  <input
                    id={fieldId("sender-number")}
                    type="tel"
                    inputMode="tel"
                    required
                    placeholder={registrationForm.senderNumberPlaceholder}
                    disabled={paymentStatus === "submitting"}
                    value={senderNumber}
                    onChange={(e) => setSenderNumber(e.target.value)}
                    aria-invalid={Boolean(paymentErrors.senderNumber)}
                    aria-describedby={paymentErrors.senderNumber ? errorId("sender-number") : undefined}
                    className={`${fieldClass} mt-2`}
                  />
                  {paymentErrors.senderNumber ? (
                    <p id={errorId("sender-number")} className={errorTextClass}>
                      {paymentErrors.senderNumber}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label htmlFor={fieldId("transaction-id")} className={labelClass}>
                    {registrationForm.transactionIdLabel}
                  </label>
                  <input
                    id={fieldId("transaction-id")}
                    type="text"
                    required
                    placeholder={registrationForm.transactionIdPlaceholder}
                    disabled={paymentStatus === "submitting"}
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    aria-invalid={Boolean(paymentErrors.transactionId)}
                    aria-describedby={paymentErrors.transactionId ? errorId("transaction-id") : undefined}
                    className={`${fieldClass} mt-2`}
                  />
                  {paymentErrors.transactionId ? (
                    <p id={errorId("transaction-id")} className={errorTextClass}>
                      {paymentErrors.transactionId}
                    </p>
                  ) : null}
                </div>
              </div>
            )}

            {paymentError ? (
              <p role="alert" className="text-ink border-hairline bg-canvas font-bengali mt-6 flex items-start gap-2.5 border p-4 text-sm">
                <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {paymentError}
              </p>
            ) : null}

            <button type="submit" disabled={paymentStatus === "submitting"} className={`${primaryButtonClass} mt-6`}>
              {paymentStatus === "submitting" ? registrationForm.loadingLabel : registrationForm.submitPaymentLabel}
            </button>
          </>
        )}
      </form>
    );
  }

  return (
    <form
      noValidate
      onSubmit={onSubmitRegistration}
      aria-busy={registerStatus === "submitting"}
      className="border-hairline bg-surface border p-6 md:p-8"
    >
      <div role="status" aria-live="polite" className="sr-only">
        {registerStatus === "submitting" ? registrationForm.loadingLabel : ""}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor={fieldId("name")} className={labelClass}>
            {registration.fields.name}
          </label>
          <input
            ref={nameRef}
            id={fieldId("name")}
            name="name"
            type="text"
            autoComplete="name"
            required
            placeholder={registration.fields.namePlaceholder}
            disabled={registerStatus === "submitting"}
            value={fields.name}
            onChange={(e) => updateField("name", e.target.value)}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? errorId("name") : undefined}
            className={`${fieldClass} mt-2`}
          />
          {fieldErrors.name ? (
            <p id={errorId("name")} className={errorTextClass}>
              {fieldErrors.name}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor={fieldId("email")} className={labelClass}>
            {registration.fields.email}
          </label>
          <input
            ref={emailRef}
            id={fieldId("email")}
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder={registration.fields.emailPlaceholder}
            disabled={registerStatus === "submitting"}
            value={fields.email}
            onChange={(e) => updateField("email", e.target.value)}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? errorId("email") : undefined}
            className={`${fieldClass} mt-2`}
          />
          {fieldErrors.email ? (
            <p id={errorId("email")} className={errorTextClass}>
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor={fieldId("phone")} className={labelClass}>
            {registration.fields.phone}
          </label>
          <input
            ref={phoneRef}
            id={fieldId("phone")}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            placeholder={registration.fields.phonePlaceholder}
            disabled={registerStatus === "submitting"}
            value={fields.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            aria-invalid={Boolean(fieldErrors.phone)}
            aria-describedby={fieldErrors.phone ? errorId("phone") : undefined}
            className={`${fieldClass} mt-2`}
          />
          {fieldErrors.phone ? (
            <p id={errorId("phone")} className={errorTextClass}>
              {fieldErrors.phone}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div className="flex min-h-11 items-start gap-3 py-1">
          <input
            ref={policyAcceptedRef}
            id={fieldId("policy-accepted")}
            name="policyAccepted"
            type="checkbox"
            required
            disabled={registerStatus === "submitting"}
            checked={fields.policyAccepted}
            onChange={(e) => updateField("policyAccepted", e.target.checked)}
            aria-invalid={Boolean(fieldErrors.policyAccepted)}
            aria-describedby={fieldErrors.policyAccepted ? errorId("policy-accepted") : undefined}
            className={checkboxClass}
          />
          <label htmlFor={fieldId("policy-accepted")} className="text-ink font-bengali text-sm leading-relaxed">
            {registration.consentPrefix}{" "}
            <Link href={legalPageLinks[1].href} className={legalLinkClass}>
              {legalPageLinks[1].label}
            </Link>
            ,{" "}
            <Link href={legalPageLinks[0].href} className={legalLinkClass}>
              {legalPageLinks[0].label}
            </Link>{" "}
            {registration.consentJoiner}{" "}
            <Link href={legalPageLinks[2].href} className={legalLinkClass}>
              {legalPageLinks[2].label}
            </Link>{" "}
            {registration.consentSuffix}
          </label>
        </div>
        {fieldErrors.policyAccepted ? (
          <p id={errorId("policy-accepted")} className={errorTextClass}>
            {fieldErrors.policyAccepted}
          </p>
        ) : null}

        <div className="flex min-h-11 items-start gap-3 py-1">
          <input
            id={fieldId("marketing-consent")}
            name="marketingConsent"
            type="checkbox"
            disabled={registerStatus === "submitting"}
            checked={fields.marketingConsent}
            onChange={(e) => updateField("marketingConsent", e.target.checked)}
            className={checkboxClass}
          />
          <label htmlFor={fieldId("marketing-consent")} className="text-ink-muted font-bengali text-sm leading-relaxed">
            {registration.marketingConsentLabel}
          </label>
        </div>
      </div>

      {/* Honeypot — hidden from sighted and assistive-tech users, left for bots to fill. Same convention as the contact form's `company_phone` field. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
      >
        <label htmlFor={fieldId("company-phone")}>Phone number</label>
        <input
          ref={honeypotRef}
          id={fieldId("company-phone")}
          name="company_phone"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="mt-5">
        <TurnstileWidget
          ref={turnstileRef}
          siteKey={siteKey}
          onToken={setTurnstileToken}
          onExpire={() => setTurnstileToken(null)}
          onError={() => {
            setTurnstileToken(null);
            setFormError(registrationForm.turnstileWidgetError);
          }}
        />
      </div>

      {formError ? (
        <p role="alert" className="text-ink border-hairline bg-canvas font-bengali mt-6 flex items-start gap-2.5 border p-4 text-sm">
          <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {formError}
        </p>
      ) : null}

      <button type="submit" disabled={registerStatus === "submitting"} className={`${primaryButtonClass} mt-6`}>
        {registerStatus === "submitting" ? (
          registrationForm.loadingLabel
        ) : (
          <>
            {registration.submitEnabledLabel} — <span className={numericTextClass}>{formatBDT(priceBDT)}</span>
          </>
        )}
      </button>
    </form>
  );
}
