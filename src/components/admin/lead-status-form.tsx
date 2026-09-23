"use client";

import { useActionState } from "react";

import { changeStatusAction } from "@/app/admin/leads/actions";
import { STATUS_LABELS, STATUS_VALUES } from "@/lib/agency-admin/labels";
import type { InquiryStatus } from "@/lib/models/inquiry";

const initialState = { ok: true, message: "" };

export function LeadStatusForm({ id, currentStatus }: { id: string; currentStatus: InquiryStatus }) {
  const [state, formAction, isPending] = useActionState(changeStatusAction.bind(null, id), initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <select
        name="status"
        defaultValue={currentStatus}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900"
      >
        {STATUS_VALUES.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status]}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {isPending ? "Saving..." : "Update status"}
      </button>
      {state.message ? (
        <span className={`text-sm ${state.ok ? "text-green-700" : "text-red-700"}`}>{state.message}</span>
      ) : null}
    </form>
  );
}
