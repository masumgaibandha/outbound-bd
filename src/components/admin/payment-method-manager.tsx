"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  PaymentMethodForm,
  type PaymentMethodFormValues,
} from "@/components/admin/payment-method-form";
import type { PaymentMethodType } from "@/lib/models/payment-method";

export type AdminPaymentMethod = {
  id: string;
  type: PaymentMethodType;
  label: string;
  currency: string;
  beneficiaryName: string;
  details: Record<string, string>;
  instructions?: string | null;
  isActive: boolean;
};

async function submitCreate(values: PaymentMethodFormValues): Promise<string | null> {
  const response = await fetch("/api/admin/payment-methods", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...values,
      instructions: values.instructions || undefined,
    }),
  });
  const payload = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
  if (!response.ok || !payload?.ok) return payload?.message ?? "Unable to save.";
  return null;
}

async function submitUpdate(id: string, values: Partial<PaymentMethodFormValues>): Promise<string | null> {
  const response = await fetch(`/api/admin/payment-methods/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  const payload = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
  if (!response.ok || !payload?.ok) return payload?.message ?? "Unable to save.";
  return null;
}

export function PaymentMethodManager({ methods }: { methods: AdminPaymentMethod[] }) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        {isCreating ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-neutral-900">New payment method</h3>
            <PaymentMethodForm
              submitLabel="Create method"
              onCancel={() => setIsCreating(false)}
              onSubmit={async (values) => {
                const message = await submitCreate(values);
                if (!message) {
                  setIsCreating(false);
                  router.refresh();
                }
                return message;
              }}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Add payment method
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {methods.length === 0 ? (
          <p className="text-sm text-neutral-500">No payment methods yet.</p>
        ) : (
          methods.map((method) =>
            editingId === method.id ? (
              <div key={method.id} className="rounded-lg border border-neutral-200 bg-white p-5">
                <h3 className="mb-4 text-sm font-semibold text-neutral-900">Edit payment method</h3>
                <PaymentMethodForm
                  submitLabel="Save changes"
                  initialValues={{
                    type: method.type,
                    label: method.label,
                    currency: method.currency as PaymentMethodFormValues["currency"],
                    beneficiaryName: method.beneficiaryName,
                    details: method.details,
                    instructions: method.instructions ?? "",
                    isActive: method.isActive,
                  }}
                  onCancel={() => setEditingId(null)}
                  onSubmit={async (values) => {
                    const message = await submitUpdate(method.id, values);
                    if (!message) {
                      setEditingId(null);
                      router.refresh();
                    }
                    return message;
                  }}
                />
              </div>
            ) : (
              <div
                key={method.id}
                className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    {method.label}{" "}
                    <span
                      className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        method.isActive ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {method.isActive ? "Active" : "Inactive"}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {method.type} &middot; {method.currency} &middot; {method.beneficiaryName}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingId(method.id)}
                    className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await submitUpdate(method.id, { isActive: !method.isActive });
                      router.refresh();
                    }}
                    className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    {method.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            ),
          )
        )}
      </div>
    </div>
  );
}
