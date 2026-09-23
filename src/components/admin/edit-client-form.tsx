"use client";

import { useActionState, type ReactNode } from "react";

import { updateClientAction } from "@/app/admin/clients/actions";
import { CLIENT_PLAN_LABELS, CLIENT_STATUS_LABELS } from "@/lib/agency-admin/clients-labels";
import { CLIENT_PLAN_VALUES, CLIENT_STATUS_VALUES } from "@/lib/agency-admin/clients-validation";
import type { ClientDetail } from "@/lib/agency-admin/clients-repository";
import { utcInstantToDhakaDateOnly } from "@/lib/agency-admin/timezone";

const initialState = { ok: true, message: "" };

export function EditClientForm({ client }: { client: ClientDetail }) {
  const [state, formAction, isPending] = useActionState(updateClientAction.bind(null, client.id), initialState);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Field label="Name">
        <input
          type="text"
          name="name"
          required
          defaultValue={client.name}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </Field>
      <Field label="Company or agency name">
        <input
          type="text"
          name="company"
          required
          defaultValue={client.company}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </Field>
      <Field label="Email">
        <input
          type="email"
          name="email"
          required
          defaultValue={client.email}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </Field>
      <Field label="Website">
        <input
          type="text"
          name="website"
          required
          defaultValue={client.website}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </Field>
      <Field label="Plan">
        <select
          name="plan"
          required
          defaultValue={client.plan}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          {CLIENT_PLAN_VALUES.map((plan) => (
            <option key={plan} value={plan}>
              {CLIENT_PLAN_LABELS[plan]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Status">
        <select
          name="status"
          required
          defaultValue={client.status}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          {CLIENT_STATUS_VALUES.map((status) => (
            <option key={status} value={status}>
              {CLIENT_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Monthly amount (USD)">
        <input
          type="number"
          name="monthlyAmountCents"
          required
          min="0.01"
          step="0.01"
          defaultValue={(client.monthlyAmountCents / 100).toFixed(2)}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </Field>
      <Field label="Setup amount (USD, optional)">
        <input
          type="number"
          name="setupAmountCents"
          min="0"
          step="0.01"
          defaultValue={client.setupAmountCents !== undefined ? (client.setupAmountCents / 100).toFixed(2) : ""}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </Field>
      <Field label="Billing day of month (1 to 28)">
        <input
          type="number"
          name="billingDayOfMonth"
          required
          min="1"
          max="28"
          step="1"
          defaultValue={client.billingDayOfMonth}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </Field>
      <Field label="Start date">
        <input
          type="date"
          name="startDate"
          required
          defaultValue={utcInstantToDhakaDateOnly(client.startDate)}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </Field>
      <Field label="End date (optional)">
        <input
          type="date"
          name="endDate"
          defaultValue={client.endDate ? utcInstantToDhakaDateOnly(client.endDate) : ""}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </Field>

      <div className="sm:col-span-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {isPending ? "Saving..." : "Save changes"}
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
