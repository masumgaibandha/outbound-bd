"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";

import { PaymentMethodDetails, type PaymentMethodView } from "@/components/dashboard/payment-method-details";

export type SubmittablePaymentMethod = PaymentMethodView & { id: string };

type FieldErrors = Partial<
  Record<
    "paymentMethodId" | "transactionReference" | "amountCents" | "currency" | "paymentDate" | "notes" | "proof",
    string
  >
>;

export function PaymentSubmissionForm({
  orderId,
  methods,
}: {
  orderId: string;
  methods: SubmittablePaymentMethod[];
}) {
  const router = useRouter();
  const formId = useId();
  const [selectedMethodId, setSelectedMethodId] = useState(methods[0]?.id ?? "");
  const [transactionReference, setTransactionReference] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const selectedMethod = methods.find((method) => method.id === selectedMethodId);

  if (methods.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        No payment methods are available right now. Please check back shortly or contact us.
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMethod) return;

    setError(null);
    setFieldErrors({});

    if (!proofFile) {
      setFieldErrors({ proof: "Attach your payment proof." });
      return;
    }

    const amountCents = Math.round(Number.parseFloat(amount) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setFieldErrors({ amountCents: "Enter the amount you paid." });
      return;
    }

    setIsSubmitting(true);

    const body = new FormData();
    body.set("paymentMethodId", selectedMethod.id);
    body.set("transactionReference", transactionReference);
    body.set("amountCents", String(amountCents));
    body.set("currency", selectedMethod.currency);
    body.set("paymentDate", paymentDate);
    body.set("notes", notes);
    body.set("idempotencyKey", crypto.randomUUID());
    body.set("proof", proofFile);

    try {
      const response = await fetch(`/api/orders/${orderId}/payments`, {
        method: "POST",
        body,
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        fieldErrors?: FieldErrors;
      } | null;

      if (!response.ok || !payload?.ok) {
        setError(payload?.message ?? "Unable to submit payment. Please try again.");
        setFieldErrors(payload?.fieldErrors ?? {});
        setIsSubmitting(false);
        return;
      }

      router.refresh();
    } catch {
      setError("Unable to submit payment. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor={`${formId}-method`} className="text-sm font-medium text-neutral-900">
          Payment method
        </label>
        <select
          id={`${formId}-method`}
          value={selectedMethodId}
          onChange={(event) => setSelectedMethodId(event.target.value)}
          className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
        >
          {methods.map((method) => (
            <option key={method.id} value={method.id}>
              {method.label} ({method.currency})
            </option>
          ))}
        </select>
      </div>

      {selectedMethod ? <PaymentMethodDetails method={selectedMethod} /> : null}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${formId}-reference`} className="text-sm font-medium text-neutral-900">
              Transaction / reference ID
            </label>
            <input
              id={`${formId}-reference`}
              type="text"
              value={transactionReference}
              onChange={(event) => setTransactionReference(event.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
            />
            {fieldErrors.transactionReference ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.transactionReference}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor={`${formId}-amount`} className="text-sm font-medium text-neutral-900">
              Amount paid ({selectedMethod?.currency ?? "—"})
            </label>
            <input
              id={`${formId}-amount`}
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
            />
            {fieldErrors.amountCents ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.amountCents}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor={`${formId}-date`} className="text-sm font-medium text-neutral-900">
              Payment date
            </label>
            <input
              id={`${formId}-date`}
              type="date"
              value={paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              required
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
            />
            {fieldErrors.paymentDate ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.paymentDate}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor={`${formId}-proof`} className="text-sm font-medium text-neutral-900">
              Payment proof (PNG, JPEG, WebP, or PDF)
            </label>
            <input
              id={`${formId}-proof`}
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              onChange={(event) => setProofFile(event.target.files?.[0] ?? null)}
              required
              className="mt-1 block w-full text-sm text-neutral-900"
            />
            {fieldErrors.proof ? <p className="mt-1 text-xs text-red-600">{fieldErrors.proof}</p> : null}
          </div>
        </div>

        <div>
          <label htmlFor={`${formId}-notes`} className="text-sm font-medium text-neutral-900">
            Notes (optional)
          </label>
          <textarea
            id={`${formId}-notes`}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
          />
          {fieldErrors.notes ? <p className="mt-1 text-xs text-red-600">{fieldErrors.notes}</p> : null}
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
          >
            {isSubmitting ? "Submitting…" : "Submit payment"}
          </button>
        </div>
      </form>
    </div>
  );
}
