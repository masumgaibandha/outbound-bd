"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ACTIVE_CLIENTS_OPTIONS,
  AGENCY_NEED_OPTIONS,
  agencyInquirySchema,
  type AgencyInquiryFieldErrors,
} from "@/lib/agency-inquiry-schema";
import { captureAgencyAttributionOnLoad, getStoredAgencyAttribution } from "@/lib/agency-attribution";
import { storeAgencyLeadPrefill } from "@/lib/agency-lead-prefill";
import { AlertTriangleIcon, ChevronDownIcon } from "@/components/public/icons";
import { buttonClass } from "@/components/public/button";
import { BUDGET_RANGE_OPTIONS } from "@/lib/inquiry-schema";
import { readBrowserCookie } from "@/lib/tracking/browser-cookie";
import { fireAgencyLeadPixelEvent } from "@/lib/tracking/fire-lead-pixel-event";

const fieldClass =
  "border-hairline bg-canvas text-ink placeholder:text-ink-muted/70 focus-visible:border-ink focus-visible:outline-action w-full rounded-lg border px-4 py-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

const selectFieldClass = `${fieldClass} appearance-none pr-9`;

const labelClass = "text-ink block text-sm font-medium";

type SubmitState = "idle" | "submitting" | "error";

export function AgencyLeadForm() {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<AgencyInquiryFieldErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [topLevelError, setTopLevelError] = useState<string | null>(null);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    startedAtRef.current = Date.now();
    captureAgencyAttributionOnLoad();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTopLevelError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const raw = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      website: String(formData.get("website") ?? ""),
      activeClients: String(formData.get("activeClients") ?? ""),
      need: String(formData.get("need") ?? ""),
      budgetRange: String(formData.get("budgetRange") ?? ""),
      privacyConsent,
    };

    const parsed = agencyInquirySchema.safeParse(raw);
    if (!parsed.success) {
      const errors: AgencyInquiryFieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof AgencyInquiryFieldErrors;
        errors[key] ??= issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitState("submitting");

    // Same eventId shared by the browser fbq call and the server-side CAPI
    // call below, for Meta's own deduplication — same convention as
    // src/components/public/contact-form.tsx.
    const eventId = crypto.randomUUID();

    try {
      const response = await fetch("/api/agencies-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parsed.data,
          honeypot: String(formData.get("hp_confirm") ?? ""),
          startedAt: startedAtRef.current ?? Date.now(),
          eventId,
          eventSourceUrl: window.location.href,
          fbp: readBrowserCookie("_fbp"),
          fbc: readBrowserCookie("_fbc"),
          attribution: getStoredAgencyAttribution(),
        }),
      });

      if (response.ok) {
        // Only after the API confirms the lead was actually saved — never
        // fired for a client-side validation failure or a network error.
        fireAgencyLeadPixelEvent(eventId);
        // Passed via sessionStorage, never a URL — see
        // src/lib/agency-lead-prefill.ts's own doc comment for why.
        storeAgencyLeadPrefill({ name: parsed.data.name, email: parsed.data.email });
        router.push("/agencies/thank-you");
        return;
      }

      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        fieldErrors?: AgencyInquiryFieldErrors;
      } | null;

      if (response.status === 400 && payload?.fieldErrors) {
        setFieldErrors(payload.fieldErrors);
      }

      setTopLevelError(
        payload?.message ?? "Something went wrong. Please try again.",
      );
      setSubmitState("error");
    } catch {
      setTopLevelError(
        "Something went wrong sending your details. Please try again.",
      );
      setSubmitState("error");
    }
  }

  return (
    <form
      id="lead-form"
      onSubmit={handleSubmit}
      noValidate
      className="border-hairline bg-surface scroll-mt-24 border p-8 md:p-10"
    >
      {/*
       * Honeypot: hidden from sighted and assistive-tech users, left for
       * bots to fill. Deliberately named/labeled with no contact-field
       * word (no phone/email/name/address/company/website) — a prior name
       * ("agency_phone", labeled "Phone number") got silently autofilled
       * by Chrome for real visitors with a saved phone number, since
       * Chrome ignores `autocomplete="off"` for contact-type fields; that
       * caused real, paid-traffic leads to be dropped without any error
       * (see the "lead_submission_skipped" log this now also produces).
       * `autoComplete="new-password"` is the one value Chrome reliably
       * respects for "never autofill this," regardless of field name/label.
       */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
      >
        <label htmlFor="hp_confirm">Leave this field empty</label>
        <input
          id="hp_confirm"
          name="hp_confirm"
          type="text"
          tabIndex={-1}
          aria-hidden="true"
          autoComplete="new-password"
        />
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
        <Field id="name" label="Your name" error={fieldErrors.name}>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? "name-error" : undefined}
            className={fieldClass}
          />
        </Field>

        <Field id="email" label="Work email" error={fieldErrors.email}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@agency.com"
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            className={fieldClass}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field id="website" label="Agency website" error={fieldErrors.website}>
            <input
              id="website"
              name="website"
              type="text"
              autoComplete="url"
              placeholder="youragency.com"
              aria-invalid={Boolean(fieldErrors.website)}
              aria-describedby={fieldErrors.website ? "website-error" : undefined}
              className={fieldClass}
            />
          </Field>
        </div>

        <Field id="activeClients" label="Active clients" error={fieldErrors.activeClients}>
          <div className="relative">
            <select
              id="activeClients"
              name="activeClients"
              defaultValue=""
              className={selectFieldClass}
              aria-invalid={Boolean(fieldErrors.activeClients)}
              aria-describedby={fieldErrors.activeClients ? "activeClients-error" : undefined}
            >
              <option value="" disabled>
                Select a range
              </option>
              {ACTIVE_CLIENTS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDownIcon
              width={16}
              height={16}
              aria-hidden="true"
              className="text-ink-muted pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
            />
          </div>
        </Field>

        <Field id="need" label="What do you need" error={fieldErrors.need}>
          <div className="relative">
            <select
              id="need"
              name="need"
              defaultValue=""
              className={selectFieldClass}
              aria-invalid={Boolean(fieldErrors.need)}
              aria-describedby={fieldErrors.need ? "need-error" : undefined}
            >
              <option value="" disabled>
                Select one
              </option>
              {AGENCY_NEED_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDownIcon
              width={16}
              height={16}
              aria-hidden="true"
              className="text-ink-muted pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
            />
          </div>
        </Field>

        <div className="sm:col-span-2">
          <Field id="budgetRange" label="Monthly budget" error={fieldErrors.budgetRange}>
            <div className="relative">
              <select
                id="budgetRange"
                name="budgetRange"
                defaultValue=""
                className={selectFieldClass}
                aria-invalid={Boolean(fieldErrors.budgetRange)}
                aria-describedby={fieldErrors.budgetRange ? "budgetRange-error" : undefined}
              >
                <option value="" disabled>
                  Select a budget range
                </option>
                {BUDGET_RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDownIcon
                width={16}
                height={16}
                aria-hidden="true"
                className="text-ink-muted pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
              />
            </div>
          </Field>
        </div>
      </div>

      <div className="mt-6 flex items-start gap-3">
        <input
          id="privacyConsent"
          type="checkbox"
          checked={privacyConsent}
          onChange={(event) => setPrivacyConsent(event.target.checked)}
          aria-invalid={Boolean(fieldErrors.privacyConsent)}
          aria-describedby={fieldErrors.privacyConsent ? "privacyConsent-error" : undefined}
          className="border-hairline text-action focus-visible:outline-action mt-0.5 h-4 w-4 shrink-0 rounded focus-visible:outline-2 focus-visible:outline-offset-2"
        />
        <div>
          <label htmlFor="privacyConsent" className="text-ink-muted text-sm">
            I agree to the{" "}
            <Link
              href="/privacy-policy"
              className="text-ink decoration-action hover:text-action font-medium underline decoration-2 underline-offset-2 transition-colors"
            >
              Privacy Policy
            </Link>
            .
          </label>
          {fieldErrors.privacyConsent ? (
            <p id="privacyConsent-error" role="alert" className="text-ink mt-1 text-sm font-medium">
              {fieldErrors.privacyConsent}
            </p>
          ) : null}
        </div>
      </div>

      {topLevelError ? (
        <p
          role="alert"
          className="text-ink border-hairline bg-accent mt-6 flex items-start gap-2.5 border p-4 text-sm"
        >
          <AlertTriangleIcon width={16} height={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {topLevelError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitState === "submitting"}
        aria-busy={submitState === "submitting"}
        className={buttonClass({
          tone: "action",
          size: "lg",
          fullWidth: true,
          className: "mt-8 disabled:cursor-not-allowed disabled:opacity-60",
        })}
      >
        {submitState === "submitting" ? "Sending…" : "Send my details"}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="mt-2">{children}</div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-ink mt-2 text-sm font-medium">
          {error}
        </p>
      ) : null}
    </div>
  );
}
