"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { createClientAction, type ClientActionResult } from "@/app/admin/clients/actions";
import { CLIENT_PLAN_LABELS } from "@/lib/agency-admin/clients-labels";
import { CLIENT_PLAN_VALUES, type ClientPlan } from "@/lib/agency-admin/clients-validation";
import { MANAGED_PLANS, type ManagedPlanId } from "@/lib/pricing-catalog";

const initialState: ClientActionResult = { ok: true, message: "" };

/** `LAUNCH`/`GROWTH`/`SCALE` map onto the published catalog price as a convenience DEFAULT for the monthly-amount field — the operator can still type any agreed price over it, since the actual client relationship may differ from the public rate card. `CUSTOM` has no catalog counterpart. */
const CATALOG_PLAN_ID_BY_CLIENT_PLAN: Partial<Record<ClientPlan, ManagedPlanId>> = {
  LAUNCH: "launch",
  GROWTH: "growth",
  SCALE: "scale",
};

function suggestedMonthlyDollars(plan: ClientPlan): string {
  const catalogId = CATALOG_PLAN_ID_BY_CLIENT_PLAN[plan];
  if (!catalogId) return "";
  const catalogPlan = MANAGED_PLANS.find((entry) => entry.id === catalogId);
  if (!catalogPlan || catalogPlan.monthlyPriceCents === null) return "";
  return (catalogPlan.monthlyPriceCents / 100).toFixed(2);
}

export interface CreateClientFormProps {
  /** `null` for the standalone "Add client" form; a lead id for the WON-lead conversion form. */
  sourceInquiryId: string | null;
  defaultName?: string;
  defaultCompany?: string;
  defaultEmail?: string;
  defaultWebsite?: string;
  /** Standalone `/admin/clients/new` navigates to the new client on success; the lead-embedded form stays put and shows an inline link instead (the lead page itself also picks up the link on its next render via `revalidatePath`). */
  navigateOnSuccess?: boolean;
}

export function CreateClientForm({
  sourceInquiryId,
  defaultName = "",
  defaultCompany = "",
  defaultEmail = "",
  defaultWebsite = "",
  navigateOnSuccess = false,
}: CreateClientFormProps) {
  const [state, formAction, isPending] = useActionState(
    createClientAction.bind(null, sourceInquiryId),
    initialState,
  );
  const router = useRouter();
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && state.clientId && navigateOnSuccess) {
      router.push(`/admin/clients/${state.clientId}`);
    }
  }, [state.ok, state.clientId, navigateOnSuccess, router]);

  if (state.ok && state.clientId && !navigateOnSuccess) {
    return (
      <p className="text-sm text-green-700">
        {state.message}{" "}
        <a href={`/admin/clients/${state.clientId}`} className="font-medium text-blue-700 hover:underline">
          View client &rarr;
        </a>
      </p>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Field label="Name">
        <input
          type="text"
          name="name"
          required
          defaultValue={defaultName}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </Field>
      <Field label="Company or agency name">
        <input
          type="text"
          name="company"
          required
          defaultValue={defaultCompany}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </Field>
      <Field label="Email">
        <input
          type="email"
          name="email"
          required
          defaultValue={defaultEmail}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </Field>
      <Field label="Website">
        <input
          type="text"
          name="website"
          required
          defaultValue={defaultWebsite}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </Field>
      <Field label="Plan">
        <select
          name="plan"
          required
          defaultValue=""
          onChange={(event) => setMonthlyAmount(suggestedMonthlyDollars(event.target.value as ClientPlan))}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="" disabled>
            Select a plan
          </option>
          {CLIENT_PLAN_VALUES.map((plan) => (
            <option key={plan} value={plan}>
              {CLIENT_PLAN_LABELS[plan]}
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
          value={monthlyAmount}
          onChange={(event) => setMonthlyAmount(event.target.value)}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </Field>
      <Field label="Setup amount (USD, optional)">
        <input
          type="number"
          name="setupAmountCents"
          min="0"
          step="0.01"
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
          defaultValue="1"
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </Field>
      <Field label="Start date">
        <input
          type="date"
          name="startDate"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </Field>

      <div className="sm:col-span-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {isPending ? "Creating..." : "Create client"}
        </button>
        {state.message && !state.ok ? <span className="text-sm text-red-700">{state.message}</span> : null}
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
