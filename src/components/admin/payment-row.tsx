"use client";

import { useActionState, useState, type ReactNode } from "react";

import { deletePaymentAction, updatePaymentAction } from "@/app/admin/payments/actions";
import { PAYMENT_METHOD_LABELS, PAYMENT_TYPE_LABELS } from "@/lib/agency-admin/clients-labels";
import { formatCents } from "@/lib/agency-admin/money";
import { PAYMENT_METHOD_VALUES, PAYMENT_TYPE_VALUES } from "@/lib/agency-admin/payments-validation";
import type { PaymentListRow } from "@/lib/agency-admin/payments-repository";
import { utcInstantToDhakaDateOnly } from "@/lib/agency-admin/timezone";

const initialState = { ok: true, message: "" };

/** One payment, rendered as a row with inline edit and a confirmed delete — used on both `/admin/payments` and a client's own payment list. `showClient` controls whether the client's company name is shown (redundant on a single client's own page). */
export function PaymentRow({ payment, showClient = true }: { payment: PaymentListRow; showClient?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [updateState, updateAction, isUpdating] = useActionState(
    updatePaymentAction.bind(null, payment.id),
    initialState,
  );
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deletePaymentAction.bind(null, payment.id),
    initialState,
  );

  if (deleteState.ok && deleteState.message) {
    return <p className="text-sm text-gray-500">{deleteState.message}</p>;
  }

  if (editing) {
    return (
      <form action={updateAction} className="rounded-md border border-gray-200 bg-gray-50 p-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Amount (USD)">
            <input
              type="number"
              name="amountCents"
              required
              min="0.01"
              step="0.01"
              defaultValue={(payment.amountCents / 100).toFixed(2)}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </Field>
          <Field label="Date paid">
            <input
              type="date"
              name="paidAt"
              required
              defaultValue={utcInstantToDhakaDateOnly(payment.paidAt)}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </Field>
          <Field label="Method">
            <select
              name="method"
              required
              defaultValue={payment.method}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              {PAYMENT_METHOD_VALUES.map((method) => (
                <option key={method} value={method}>
                  {PAYMENT_METHOD_LABELS[method]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type">
            <select
              name="type"
              required
              defaultValue={payment.type}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              {PAYMENT_TYPE_VALUES.map((type) => (
                <option key={type} value={type}>
                  {PAYMENT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Reference (optional)">
            <input
              type="text"
              name="reference"
              defaultValue={payment.reference ?? ""}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </Field>
          <Field label="Note (optional)">
            <input
              type="text"
              name="note"
              defaultValue={payment.note ?? ""}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </Field>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={isUpdating}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isUpdating ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          {updateState.message ? (
            <span className={`text-sm ${updateState.ok ? "text-green-700" : "text-red-700"}`}>{updateState.message}</span>
          ) : null}
        </div>
      </form>
    );
  }

  return (
    <div
      data-testid="payment-row"
      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-200 bg-white p-3 text-sm"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-gray-600">{utcInstantToDhakaDateOnly(payment.paidAt)}</span>
        {showClient ? <span className="font-medium text-gray-900">{payment.clientCompany}</span> : null}
        <span className="font-semibold text-gray-900">{formatCents(payment.amountCents)}</span>
        <span className="text-gray-600">{PAYMENT_METHOD_LABELS[payment.method]}</span>
        <span className="text-gray-600">{PAYMENT_TYPE_LABELS[payment.type]}</span>
        {payment.reference ? <span className="text-gray-500">Ref: {payment.reference}</span> : null}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
        >
          Edit
        </button>
        <form
          action={(formData) => {
            if (window.confirm("Delete this payment? This cannot be undone.")) {
              deleteAction(formData);
            }
          }}
        >
          <button
            type="submit"
            disabled={isDeleting}
            className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </form>
      </div>
      {deleteState.message && !deleteState.ok ? <span className="w-full text-sm text-red-700">{deleteState.message}</span> : null}
    </div>
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
