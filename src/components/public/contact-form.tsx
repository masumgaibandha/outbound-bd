"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Input, Label, TextArea } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";

import { CheckIcon, ChevronDownIcon, XIcon } from "@/components/public/icons";
import {
  BUDGET_RANGE_OPTIONS,
  SERVICE_INTEREST_OPTIONS,
  inquirySchema,
  type InquiryFieldErrors,
} from "@/lib/inquiry-schema";

const SELECT_CLASSNAME =
  "input input--primary input--full-width appearance-none pr-9";

type SubmitState = "idle" | "submitting" | "success" | "error";

type ContactFormProps = {
  initialService?: string;
  initialGoals?: string;
};

export function ContactForm({ initialService, initialGoals }: ContactFormProps) {
  const [fieldErrors, setFieldErrors] = useState<InquiryFieldErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [topLevelError, setTopLevelError] = useState<string | null>(null);
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
      budgetRange: String(formData.get("budgetRange") ?? ""),
      goals: String(formData.get("goals") ?? ""),
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
        className="rounded-xl border border-hairline bg-navy/[0.04] p-10 text-center outline-none"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-navy/[0.08] text-navy">
          <CheckIcon width={24} height={24} />
        </div>
        <h3 className="mt-5 text-xl font-semibold text-ink">
          Thanks — we&apos;ve got it
        </h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-subtext">
          Your project inquiry has been received. We&apos;ll follow up by
          email shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
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
        <Field
          id="name"
          label="Full name"
          error={fieldErrors.name}
          input={
            <Input
              id="name"
              name="name"
              autoComplete="name"
              fullWidth
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? "name-error" : undefined}
            />
          }
        />

        <Field
          id="email"
          label="Business email"
          error={fieldErrors.email}
          input={
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              fullWidth
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
            />
          }
        />

        <Field
          id="company"
          label="Company"
          error={fieldErrors.company}
          input={
            <Input
              id="company"
              name="company"
              autoComplete="organization"
              fullWidth
              aria-invalid={Boolean(fieldErrors.company)}
              aria-describedby={
                fieldErrors.company ? "company-error" : undefined
              }
            />
          }
        />

        <Field
          id="website"
          label="Company website"
          error={fieldErrors.website}
          input={
            <Input
              id="website"
              name="website"
              autoComplete="url"
              placeholder="yourcompany.com"
              fullWidth
              aria-invalid={Boolean(fieldErrors.website)}
              aria-describedby={
                fieldErrors.website ? "website-error" : undefined
              }
            />
          }
        />

        <Field
          id="service"
          label="Service you're interested in"
          error={fieldErrors.service}
          input={
            <div className="relative">
              <select
                id="service"
                name="service"
                defaultValue={initialService ?? ""}
                className={SELECT_CLASSNAME}
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
                className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-subtext"
              />
            </div>
          }
        />

        <Field
          id="budgetRange"
          label="Budget range"
          error={fieldErrors.budgetRange}
          input={
            <div className="relative">
              <select
                id="budgetRange"
                name="budgetRange"
                defaultValue=""
                className={SELECT_CLASSNAME}
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
                className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-subtext"
              />
            </div>
          }
        />

        <div className="sm:col-span-2">
          <Field
            id="goals"
            label="Project goals"
            error={fieldErrors.goals}
            input={
              <TextArea
                id="goals"
                name="goals"
                rows={5}
                fullWidth
                defaultValue={initialGoals}
                placeholder="What are you hoping to achieve, and by when?"
                aria-invalid={Boolean(fieldErrors.goals)}
                aria-describedby={
                  fieldErrors.goals ? "goals-error" : undefined
                }
              />
            }
          />
        </div>
      </div>

      {topLevelError ? (
        <p
          role="alert"
          className="flex items-start gap-2 text-sm font-medium text-royal"
        >
          <XIcon width={16} height={16} className="mt-0.5 shrink-0" />
          {topLevelError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitState === "submitting"}
        className={`${buttonVariants({ variant: "primary", size: "lg" })} w-full rounded-lg sm:w-auto`}
      >
        {submitState === "submitting" ? "Sending…" : "Send inquiry"}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  input,
}: {
  id: string;
  label: string;
  error?: string;
  input: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {input}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-royal">
          {error}
        </p>
      ) : null}
    </div>
  );
}
