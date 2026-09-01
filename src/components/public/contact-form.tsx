"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";

import { buttonClass } from "@/components/public/button";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  CircleCheckIcon,
} from "@/components/public/icons";
import {
  BUDGET_RANGE_OPTIONS,
  OUTREACH_VOLUME_OPTIONS,
  SERVICE_INTEREST_OPTIONS,
  inquirySchema,
  type InquiryFieldErrors,
} from "@/lib/inquiry-schema";

const fieldClass =
  "border-hairline bg-canvas text-ink placeholder:text-ink-muted/70 focus-visible:border-ink focus-visible:outline-action w-full rounded-lg border px-4 py-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

const selectFieldClass = `${fieldClass} appearance-none pr-9`;

const labelClass = "text-ink block text-sm font-medium";

type SubmitState = "idle" | "submitting" | "success" | "error";

type ContactFormProps = {
  initialService?: string;
  initialGoals?: string;
};

export function ContactForm({ initialService, initialGoals }: ContactFormProps) {
  const [fieldErrors, setFieldErrors] = useState<InquiryFieldErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [topLevelError, setTopLevelError] = useState<string | null>(null);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTopLevelError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const raw = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      company: String(formData.get("company") ?? ""),
      website: String(formData.get("website") ?? ""),
      service: String(formData.get("service") ?? ""),
      targetMarket: String(formData.get("targetMarket") ?? ""),
      monthlyOutreachVolume: String(formData.get("monthlyOutreachVolume") ?? ""),
      budgetRange: String(formData.get("budgetRange") ?? ""),
      currentOutreachSetup: String(formData.get("currentOutreachSetup") ?? ""),
      goals: String(formData.get("goals") ?? ""),
      privacyConsent,
    };

    const parsed = inquirySchema.safeParse(raw);
    if (!parsed.success) {
      const errors: InquiryFieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof InquiryFieldErrors;
        errors[key] ??= issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitState("submitting");

    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parsed.data,
          honeypot: String(formData.get("company_phone") ?? ""),
          startedAt: startedAtRef.current ?? Date.now(),
        }),
      });

      if (response.ok) {
        setSubmitState("success");
        form.reset();
        requestAnimationFrame(() => successRef.current?.focus());
        return;
      }

      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        fieldErrors?: InquiryFieldErrors;
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
        "Something went wrong sending your inquiry. Please try again.",
      );
      setSubmitState("error");
    }
  }

  if (submitState === "success") {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        className="border-hairline bg-surface flex flex-col items-start border p-8 outline-none md:p-10"
      >
        <CircleCheckIcon width={32} height={32} className="text-action" aria-hidden="true" />
        <h3 className="font-heading text-ink mt-5 text-2xl tracking-tight">
          Thanks — we&apos;ve got it
        </h3>
        <p className="text-ink-muted mt-3 max-w-prose leading-relaxed">
          Your project inquiry has been received. We&apos;ll follow up by
          email shortly.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="border-hairline bg-surface border p-8 md:p-10"
    >
      {/* Honeypot: hidden from sighted and assistive-tech users, left for bots to fill. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
      >
        <label htmlFor="company_phone">Phone number</label>
        <input
          id="company_phone"
          name="company_phone"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
        <Field id="name" label="Full name" error={fieldErrors.name}>
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

        <Field id="email" label="Business email" error={fieldErrors.email}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            className={fieldClass}
          />
        </Field>

        <Field id="company" label="Company" error={fieldErrors.company}>
          <input
            id="company"
            name="company"
            type="text"
            autoComplete="organization"
            aria-invalid={Boolean(fieldErrors.company)}
            aria-describedby={
              fieldErrors.company ? "company-error" : undefined
            }
            className={fieldClass}
          />
        </Field>

        <Field id="website" label="Company website" error={fieldErrors.website}>
          <input
            id="website"
            name="website"
            type="text"
            autoComplete="url"
            placeholder="yourcompany.com"
            aria-invalid={Boolean(fieldErrors.website)}
            aria-describedby={
              fieldErrors.website ? "website-error" : undefined
            }
            className={fieldClass}
          />
        </Field>

        <Field
          id="service"
          label="Service you're interested in"
          error={fieldErrors.service}
        >
          <div className="relative">
            <select
              id="service"
              name="service"
              defaultValue={initialService ?? ""}
              className={selectFieldClass}
              aria-invalid={Boolean(fieldErrors.service)}
              aria-describedby={
                fieldErrors.service ? "service-error" : undefined
              }
            >
              <option value="" disabled>
                Select a service
              </option>
              {SERVICE_INTEREST_OPTIONS.map((option) => (
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

        <Field id="targetMarket" label="Target market" error={fieldErrors.targetMarket}>
          <input
            id="targetMarket"
            name="targetMarket"
            type="text"
            placeholder="e.g. mid-market SaaS, US & UK"
            aria-invalid={Boolean(fieldErrors.targetMarket)}
            aria-describedby={
              fieldErrors.targetMarket ? "targetMarket-error" : undefined
            }
            className={fieldClass}
          />
        </Field>

        <Field
          id="monthlyOutreachVolume"
          label="Approximate monthly outreach volume"
          error={fieldErrors.monthlyOutreachVolume}
        >
          <div className="relative">
            <select
              id="monthlyOutreachVolume"
              name="monthlyOutreachVolume"
              defaultValue=""
              className={selectFieldClass}
              aria-invalid={Boolean(fieldErrors.monthlyOutreachVolume)}
              aria-describedby={
                fieldErrors.monthlyOutreachVolume
                  ? "monthlyOutreachVolume-error"
                  : undefined
              }
            >
              <option value="" disabled>
                Select a volume
              </option>
              {OUTREACH_VOLUME_OPTIONS.map((option) => (
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

        <Field id="budgetRange" label="Budget range" error={fieldErrors.budgetRange}>
          <div className="relative">
            <select
              id="budgetRange"
              name="budgetRange"
              defaultValue=""
              className={selectFieldClass}
              aria-invalid={Boolean(fieldErrors.budgetRange)}
              aria-describedby={
                fieldErrors.budgetRange ? "budgetRange-error" : undefined
              }
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

        <Field
          id="currentOutreachSetup"
          label="Current outreach setup (optional)"
          error={fieldErrors.currentOutreachSetup}
        >
          <input
            id="currentOutreachSetup"
            name="currentOutreachSetup"
            type="text"
            placeholder="e.g. one shared inbox, no dedicated infrastructure"
            aria-invalid={Boolean(fieldErrors.currentOutreachSetup)}
            aria-describedby={
              fieldErrors.currentOutreachSetup
                ? "currentOutreachSetup-error"
                : undefined
            }
            className={fieldClass}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field id="goals" label="Project goals" error={fieldErrors.goals}>
            <textarea
              id="goals"
              name="goals"
              rows={5}
              defaultValue={initialGoals}
              placeholder="What are you hoping to achieve, and by when?"
              aria-invalid={Boolean(fieldErrors.goals)}
              aria-describedby={
                fieldErrors.goals ? "goals-error" : undefined
              }
              className={`${fieldClass} resize-y`}
            />
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
          aria-describedby={
            fieldErrors.privacyConsent ? "privacyConsent-error" : undefined
          }
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
            <p
              id="privacyConsent-error"
              role="alert"
              className="text-ink mt-1 text-sm font-medium"
            >
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
          <AlertTriangleIcon
            width={16}
            height={16}
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          {topLevelError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitState === "submitting"}
        aria-busy={submitState === "submitting"}
        className={buttonClass({
          tone: "ink",
          size: "lg",
          className: "mt-8 disabled:cursor-not-allowed disabled:opacity-60",
        })}
      >
        {submitState === "submitting" ? "Sending…" : "Send inquiry"}
        <ArrowRightIcon width={16} height={16} aria-hidden="true" />
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
