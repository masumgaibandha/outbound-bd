"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Input, Label, TextArea } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";

import { XIcon } from "@/components/public/icons";
import {
  orderDetailsSchema,
  type OrderDetailsFieldErrors,
} from "@/lib/order-schema";

type SubmitState = "idle" | "submitting" | "error";

export function OrderConfirmForm({ catalogId }: { catalogId: string }) {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<OrderDetailsFieldErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [topLevelError, setTopLevelError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);

  useEffect(() => {
    idempotencyKeyRef.current = crypto.randomUUID();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTopLevelError(null);

    const formData = new FormData(event.currentTarget);
    const raw = {
      company: String(formData.get("company") ?? ""),
      website: String(formData.get("website") ?? ""),
      country: String(formData.get("country") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    };

    const parsed = orderDetailsSchema.safeParse(raw);
    if (!parsed.success) {
      const errors: OrderDetailsFieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof OrderDetailsFieldErrors;
        errors[key] ??= issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitState("submitting");

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parsed.data,
          catalogId,
          idempotencyKey: idempotencyKeyRef.current,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        fieldErrors?: OrderDetailsFieldErrors;
        orderId?: string;
      } | null;

      if (response.ok && payload?.ok && payload.orderId) {
        router.push(`/dashboard/orders/${payload.orderId}`);
        router.refresh();
        return;
      }

      if (response.status === 400 && payload?.fieldErrors) {
        setFieldErrors(payload.fieldErrors);
      }
      setTopLevelError(
        payload?.message ?? "Something went wrong. Please try again.",
      );
      setSubmitState("error");
    } catch {
      setTopLevelError(
        "Something went wrong placing your order. Please try again.",
      );
      setSubmitState("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
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
              aria-describedby={fieldErrors.company ? "company-error" : undefined}
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
              aria-describedby={fieldErrors.website ? "website-error" : undefined}
            />
          }
        />

        <Field
          id="country"
          label="Country"
          error={fieldErrors.country}
          input={
            <Input
              id="country"
              name="country"
              autoComplete="country-name"
              fullWidth
              aria-invalid={Boolean(fieldErrors.country)}
              aria-describedby={fieldErrors.country ? "country-error" : undefined}
            />
          }
        />

        <div className="sm:col-span-2">
          <Field
            id="notes"
            label="Notes (optional)"
            error={fieldErrors.notes}
            input={
              <TextArea
                id="notes"
                name="notes"
                rows={4}
                fullWidth
                placeholder="Anything we should know before we reach out?"
                aria-invalid={Boolean(fieldErrors.notes)}
                aria-describedby={fieldErrors.notes ? "notes-error" : undefined}
              />
            }
          />
        </div>
      </div>

      {topLevelError ? (
        <p role="alert" className="flex items-start gap-2 text-sm font-medium text-royal">
          <XIcon width={16} height={16} className="mt-0.5 shrink-0" />
          {topLevelError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitState === "submitting"}
        className={`${buttonVariants({ variant: "primary", size: "lg" })} w-full rounded-lg sm:w-auto`}
      >
        {submitState === "submitting" ? "Confirming…" : "Confirm order"}
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
