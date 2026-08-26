"use client";

import { useId, useState } from "react";

import {
  PAYMENT_METHOD_CURRENCIES,
  PAYMENT_METHOD_TYPES,
  type PaymentMethodCurrency,
  type PaymentMethodType,
} from "@/lib/payment-method-constants";

const TYPE_LABELS: Record<PaymentMethodType, string> = {
  BD_BANK: "Bangladesh bank account",
  US_BANK: "US bank account",
  UK_BANK: "UK bank account",
  PAYONEER: "Payoneer",
  WISE: "Wise",
};

// Suggested field names shown when starting a new method of each type —
// purely a UI hint; admins can rename, remove, or add any field.
const SUGGESTED_DETAIL_KEYS: Record<PaymentMethodType, string[]> = {
  BD_BANK: ["bankName", "accountNumber", "routingNumber", "branch"],
  US_BANK: ["bankName", "accountNumber", "routingNumber", "accountType"],
  UK_BANK: ["bankName", "accountNumber", "sortCode", "iban"],
  PAYONEER: ["email"],
  WISE: ["email"],
};

export type PaymentMethodFormValues = {
  type: PaymentMethodType;
  label: string;
  currency: PaymentMethodCurrency;
  beneficiaryName: string;
  details: Record<string, string>;
  instructions: string;
  isActive: boolean;
};

const EMPTY_VALUES: PaymentMethodFormValues = {
  type: "US_BANK",
  label: "",
  currency: "USD",
  beneficiaryName: "",
  details: {},
  instructions: "",
  isActive: true,
};

export function PaymentMethodForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialValues?: PaymentMethodFormValues;
  submitLabel: string;
  onSubmit: (values: PaymentMethodFormValues) => Promise<string | null>;
  onCancel?: () => void;
}) {
  const formId = useId();
  const [values, setValues] = useState<PaymentMethodFormValues>(initialValues ?? EMPTY_VALUES);
  const [detailRows, setDetailRows] = useState<{ key: string; value: string }[]>(() => {
    const source = initialValues?.details ?? {};
    const rows = Object.entries(source).map(([key, value]) => ({ key, value }));
    return rows.length > 0
      ? rows
      : SUGGESTED_DETAIL_KEYS[values.type].map((key) => ({ key, value: "" }));
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleTypeChange(type: PaymentMethodType) {
    setValues((prev) => ({ ...prev, type }));
    if (!initialValues) {
      setDetailRows(SUGGESTED_DETAIL_KEYS[type].map((key) => ({ key, value: "" })));
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const details: Record<string, string> = {};
    for (const row of detailRows) {
      if (row.key.trim() && row.value.trim()) {
        details[row.key.trim()] = row.value.trim();
      }
    }

    const message = await onSubmit({ ...values, details });
    setIsSubmitting(false);
    if (message) setError(message);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${formId}-type`} className="text-sm font-medium text-neutral-900">
            Type
          </label>
          <select
            id={`${formId}-type`}
            value={values.type}
            onChange={(event) => handleTypeChange(event.target.value as PaymentMethodType)}
            className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
          >
            {PAYMENT_METHOD_TYPES.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`${formId}-currency`} className="text-sm font-medium text-neutral-900">
            Currency
          </label>
          <select
            id={`${formId}-currency`}
            value={values.currency}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, currency: event.target.value as PaymentMethodCurrency }))
            }
            className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
          >
            {PAYMENT_METHOD_CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`${formId}-label`} className="text-sm font-medium text-neutral-900">
            Label (shown to clients)
          </label>
          <input
            id={`${formId}-label`}
            type="text"
            value={values.label}
            onChange={(event) => setValues((prev) => ({ ...prev, label: event.target.value }))}
            required
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
          />
        </div>

        <div>
          <label htmlFor={`${formId}-beneficiary`} className="text-sm font-medium text-neutral-900">
            Beneficiary name
          </label>
          <input
            id={`${formId}-beneficiary`}
            type="text"
            value={values.beneficiaryName}
            onChange={(event) => setValues((prev) => ({ ...prev, beneficiaryName: event.target.value }))}
            required
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
          />
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-neutral-900">Beneficiary details</p>
        <div className="mt-2 flex flex-col gap-2">
          {detailRows.map((row, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                placeholder="Field name (e.g. accountNumber)"
                value={row.key}
                onChange={(event) =>
                  setDetailRows((prev) =>
                    prev.map((r, i) => (i === index ? { ...r, key: event.target.value } : r)),
                  )
                }
                className="w-1/3 rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
              />
              <input
                type="text"
                placeholder="Value"
                value={row.value}
                onChange={(event) =>
                  setDetailRows((prev) =>
                    prev.map((r, i) => (i === index ? { ...r, value: event.target.value } : r)),
                  )
                }
                className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
              />
              <button
                type="button"
                onClick={() => setDetailRows((prev) => prev.filter((_, i) => i !== index))}
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setDetailRows((prev) => [...prev, { key: "", value: "" }])}
            className="self-start text-sm font-medium text-neutral-900 underline underline-offset-2"
          >
            Add field
          </button>
        </div>
      </div>

      <div>
        <label htmlFor={`${formId}-instructions`} className="text-sm font-medium text-neutral-900">
          Instructions (optional)
        </label>
        <textarea
          id={`${formId}-instructions`}
          value={values.instructions}
          onChange={(event) => setValues((prev) => ({ ...prev, instructions: event.target.value }))}
          rows={3}
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-900">
        <input
          type="checkbox"
          checked={values.isActive}
          onChange={(event) => setValues((prev) => ({ ...prev, isActive: event.target.checked }))}
        />
        Active (visible to clients)
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
        >
          {isSubmitting ? "Saving…" : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
