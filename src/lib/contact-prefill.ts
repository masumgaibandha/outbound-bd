import { SERVICE_INTEREST_OPTIONS } from "@/lib/inquiry-schema";
import { getCatalogEntryById, getCatalogPrefillNote } from "@/lib/pricing-catalog";

export type ContactPrefillParams = {
  plan?: string;
  service?: string;
};

export type ContactPrefillResult = {
  initialService?: string;
  initialGoals?: string;
  selectedPlanName?: string;
};

/**
 * Resolves the `/contact?service=...&plan=...` query params coming from a
 * pricing/service CTA into form-prefill values. A valid `plan` is
 * authoritative for both the service and the prefill note, so a mismatched
 * `service` param can't contradict it. Kept as a pure function (no
 * searchParams/Next types) so it's testable without rendering the page.
 */
export function resolveContactPrefill({
  plan,
  service,
}: ContactPrefillParams): ContactPrefillResult {
  const planEntry = plan ? getCatalogEntryById(plan) : undefined;
  const isServiceValid = SERVICE_INTEREST_OPTIONS.some(
    (option) => option.value === service,
  );

  const initialService = planEntry
    ? planEntry.relatedServiceSlug
    : isServiceValid
      ? service
      : undefined;
  const initialGoals = planEntry ? getCatalogPrefillNote(planEntry) : undefined;

  return {
    initialService,
    initialGoals,
    selectedPlanName: planEntry?.name,
  };
}
