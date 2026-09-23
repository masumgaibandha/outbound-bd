"use client";

import { useActionState, useRef } from "react";

import { addClientNoteAction } from "@/app/admin/clients/actions";

const initialState = { ok: true, message: "" };

export function ClientNoteForm({ id }: { id: string }) {
  const [state, formAction, isPending] = useActionState(addClientNoteAction.bind(null, id), initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
      className="flex flex-col gap-2"
    >
      <textarea
        name="text"
        required
        maxLength={2000}
        rows={3}
        placeholder="Add a private note..."
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {isPending ? "Adding..." : "Add note"}
        </button>
        {state.message ? (
          <span className={`text-sm ${state.ok ? "text-green-700" : "text-red-700"}`}>{state.message}</span>
        ) : null}
      </div>
    </form>
  );
}
