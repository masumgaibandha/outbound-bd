import type { ServiceSlug } from "@/components/public/services-data";

/**
 * Centralized, typed catalog of every priced offer Outbound BD sells.
 * This is the single source of truth for pricing — the /pricing page reads
 * from it, and the future ordering system should read from it too rather
 * than re-declaring prices elsewhere. All money is stored in integer cents
 * to avoid floating-point rounding issues.
 */

export type ServiceInterest = ServiceSlug | "not-sure";

export type ManagedPlanId = "launch" | "growth" | "scale";

export type ManagedPlan = {
  kind: "managed-plan";
  id: ManagedPlanId;
  name: string;
  monthlyPriceCents: number;
  setupPriceCents: number;
  campaigns: string;
  leadsIncluded: number;
  inboxes: string;
  relatedServiceSlug: ServiceInterest;
};

export type OneTimeCategoryId =
  | "infrastructure-setup"
  | "verified-leads"
  | "deliverability"
  | "consultation";

export type OneTimeOffer = {
  kind: "one-time-offer";
  id: string;
  category: OneTimeCategoryId;
  name: string;
  priceCents: number;
  unit: string;
  relatedServiceSlug: ServiceInterest;
};

export type CatalogEntry = ManagedPlan | OneTimeOffer;

// Every inclusion below is part of every Managed Outreach plan — the tiers
// differ in scope (campaigns/leads/inboxes), not in which disciplines are
// covered.
export const MANAGED_OUTREACH_INCLUSIONS = [
  "Targeting & ICP definition",
  "Verified leads",
  "Copywriting for every sequence",
  "Full infrastructure setup",
  "Ongoing campaign management",
  "Deliverability monitoring",
  "Continuous optimization",
  "Weekly reporting",
] as const;

export const MANAGED_PLANS: ManagedPlan[] = [
  {
    kind: "managed-plan",
    id: "launch",
    name: "Launch",
    monthlyPriceCents: 39900,
    setupPriceCents: 19900,
    campaigns: "1 campaign",
    leadsIncluded: 2500,
    inboxes: "Up to 15 inboxes",
    relatedServiceSlug: "cold-email-outreach",
  },
  {
    kind: "managed-plan",
    id: "growth",
    name: "Growth",
    monthlyPriceCents: 69900,
    setupPriceCents: 34900,
    campaigns: "Up to 3 campaigns",
    leadsIncluded: 5000,
    inboxes: "Up to 30 inboxes",
    relatedServiceSlug: "cold-email-outreach",
  },
  {
    kind: "managed-plan",
    id: "scale",
    name: "Scale",
    monthlyPriceCents: 99900,
    setupPriceCents: 59900,
    campaigns: "Up to 5 campaigns",
    leadsIncluded: 10000,
    inboxes: "Up to 60 inboxes",
    relatedServiceSlug: "cold-email-outreach",
  },
];

export const ONE_TIME_CATEGORIES: { id: OneTimeCategoryId; label: string }[] = [
  { id: "infrastructure-setup", label: "Infrastructure setup" },
  { id: "verified-leads", label: "Verified leads" },
  { id: "deliverability", label: "Deliverability" },
  { id: "consultation", label: "Consultation" },
];

export const ONE_TIME_OFFERS: OneTimeOffer[] = [
  {
    kind: "one-time-offer",
    id: "infra-setup-15",
    category: "infrastructure-setup",
    name: "Infrastructure Setup — up to 15 inboxes",
    priceCents: 19900,
    unit: "one-time",
    relatedServiceSlug: "email-infrastructure",
  },
  {
    kind: "one-time-offer",
    id: "infra-setup-30",
    category: "infrastructure-setup",
    name: "Infrastructure Setup — up to 30 inboxes",
    priceCents: 34900,
    unit: "one-time",
    relatedServiceSlug: "email-infrastructure",
  },
  {
    kind: "one-time-offer",
    id: "infra-setup-60",
    category: "infrastructure-setup",
    name: "Infrastructure Setup — up to 60 inboxes",
    priceCents: 59900,
    unit: "one-time",
    relatedServiceSlug: "email-infrastructure",
  },
  {
    kind: "one-time-offer",
    id: "leads-1000",
    category: "verified-leads",
    name: "1,000 Verified Leads",
    priceCents: 9900,
    unit: "one-time",
    relatedServiceSlug: "lead-generation",
  },
  {
    kind: "one-time-offer",
    id: "leads-3000",
    category: "verified-leads",
    name: "3,000 Verified Leads",
    priceCents: 24900,
    unit: "one-time",
    relatedServiceSlug: "lead-generation",
  },
  {
    kind: "one-time-offer",
    id: "leads-5000",
    category: "verified-leads",
    name: "5,000 Verified Leads",
    priceCents: 39900,
    unit: "one-time",
    relatedServiceSlug: "lead-generation",
  },
  {
    kind: "one-time-offer",
    id: "deliverability-audit",
    category: "deliverability",
    name: "Deliverability Audit",
    priceCents: 9900,
    unit: "one-time",
    relatedServiceSlug: "email-deliverability",
  },
  {
    kind: "one-time-offer",
    id: "deliverability-recovery",
    category: "deliverability",
    name: "Deliverability Recovery",
    priceCents: 24900,
    unit: "one-time",
    relatedServiceSlug: "email-deliverability",
  },
  {
    kind: "one-time-offer",
    id: "consultation-30",
    category: "consultation",
    name: "30-Minute Consultation",
    priceCents: 2900,
    unit: "per session",
    relatedServiceSlug: "not-sure",
  },
  {
    kind: "one-time-offer",
    id: "consultation-60",
    category: "consultation",
    name: "60-Minute Consultation",
    priceCents: 4900,
    unit: "per session",
    relatedServiceSlug: "not-sure",
  },
];

export const CATALOG: CatalogEntry[] = [...MANAGED_PLANS, ...ONE_TIME_OFFERS];

export function getCatalogEntryById(id: string): CatalogEntry | undefined {
  return CATALOG.find((entry) => entry.id === id);
}

export function getOneTimeOffersByCategory(
  category: OneTimeCategoryId,
): OneTimeOffer[] {
  return ONE_TIME_OFFERS.filter((offer) => offer.category === category);
}

/** Formats integer cents as a whole-dollar USD string, e.g. 39900 -> "$399". */
export function formatPriceCents(cents: number): string {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: dollars % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** Short human summary for a catalog entry, used to prefill the contact form. */
export function getCatalogPrefillNote(entry: CatalogEntry): string {
  if (entry.kind === "managed-plan") {
    return `Interested in the ${entry.name} plan (${formatPriceCents(
      entry.monthlyPriceCents,
    )}/month + ${formatPriceCents(entry.setupPriceCents)} setup).`;
  }
  return `Interested in ${entry.name} (${formatPriceCents(entry.priceCents)}, ${entry.unit}).`;
}

/** Builds the validated /contact query string for a catalog entry's CTA. */
export function getCatalogContactHref(entry: CatalogEntry): string {
  const params = new URLSearchParams({
    service: entry.relatedServiceSlug,
    plan: entry.id,
  });
  return `/contact?${params.toString()}`;
}
