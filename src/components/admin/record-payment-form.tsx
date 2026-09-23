"use client";

import { useActionState, useRef, type ReactNode } from "react";

import { createPaymentAction } from "@/app/admin/payments/actions";
import { PAYMENT_METHOD_LABELS, PAYMENT_TYPE_LABELS } from "@/lib/agency-admin/clients-labels";
import { PAYMENT_METHOD_VALUES, PAYMENT_TYPE_VALUES } from "@/lib/agency-admin/payments-validation";

const initialState = { ok: true, message: "" };

export function RecordPaymentForm({ clientId }: { clientId: string }) {
  const [state, formAction, isPending] = useActionState(createPaymentAction.bind(null, clientId), initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      <Field label="Amount (USD)">
        <input
          type="number"
          name="amountCents"
          required
          min="0.01"
          step="0.01"
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </Field>
      <Field label="Date paid">
        <input
          type="date"
          name="paidAt"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </Field>
      <Field label="Method">
        <select name="method" required defaultValue="" className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm">
          <option value="" disabled>
            Select a method
          </option>
          {PAYMENT_METHOD_VALUES.map((method) => (
            <option key={method} value={method}>
              {PAYMENT_METHOD_LABELS[method]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Type">
        <select name="type" required defaultValue="" className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm">
          <option value="" disabled>
            Select a type
          </option>
          {PAYMENT_TYPE_VALUES.map((type) => (
            <option key={type} value={type}>
              {PAYMENT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Reference or invoice number (optional)">
        <input type="text" name="reference" className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
      </Field>
      <Field label="Note (optional)">
        <input type="text" name="note" className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
      </Field>

      <div className="sm:col-span-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {isPending ? "Recording..." : "Record payment"}
        </button>
        {state.message ? (
          <span className={`text-sm ${state.ok ? "text-green-700" : "text-red-700"}`}>{state.message}</span>
        ) : null}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}
