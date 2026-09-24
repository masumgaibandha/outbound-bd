import type { ServiceSlug } from "@/components/public/services-data";

/**
 * Centralized, typed catalog of every priced offer Outbound BD sells. This
 * is the single source of truth for pricing guidance shown on /pricing and
 * quoted into the "Request a Proposal" contact flow — Outbound BD is a
 * consultation-led agency, not a self-serve checkout, so these figures are
 * starting points confirmed during scoping, not live purchasable prices.
 * All money is stored in integer cents to avoid floating-point rounding
 * issues.
 */

export type ServiceInterest = ServiceSlug | "not-sure";

export type ManagedPlanId = "launch" | "growth" | "scale";

export type ManagedPlan = {
  kind: "managed-plan";
  id: ManagedPlanId;
  name: string;
  /** `null` means "Contact for price" — no public starting number for this tier. */
  monthlyPriceCents: number | null;
  setupPriceCents: number;
  tagline: string;
  /** Rendered as the plan card's bullet list, in order. */
  features: string[];
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
    monthlyPriceCents: 49900,
    setupPriceCents: 19900,
    tagline: "For one offer and one target market.",
    features: [
      "3 sending domains and up to 9 inboxes, fully set up (DNS, SPF, DKIM, DMARC)",
      "Inbox warm-up and ongoing deliverability monitoring",
      "Up to 1,500 verified leads per month, matched to your ideal customer",
      "1 campaign with a 3-step email sequence",
      "Copy written and tested for your offer",
      "Reply handling and lead tagging",
      "Weekly report",
    ],
    relatedServiceSlug: "cold-email-outreach",
  },
  {
    kind: "managed-plan",
    id: "growth",
    name: "Growth",
    monthlyPriceCents: 99900,
    setupPriceCents: 34900,
    tagline: "For agencies or companies running more than one offer or market.",
    features: [
      "6 sending domains and up to 18 inboxes, fully set up, with a custom tracking domain",
      "Inbox warm-up, deliverability monitoring and blacklist checks",
      "Up to 4,000 verified leads per month",
      "Up to 3 campaigns running at once, each with its own sequence",
      "A/B testing of subject lines and copy",
      "Reply handling, lead tagging, and interested leads sent to your CRM or inbox",
      "Weekly report plus a monthly strategy call",
    ],
    relatedServiceSlug: "cold-email-outreach",
  },
  {
    kind: "managed-plan",
    id: "scale",
    name: "Scale",
    // "Contact for price" — no public starting number for this tier.
    monthlyPriceCents: null,
    setupPriceCents: 59900,
    tagline: "For high volume or multiple clients.",
    features: [
      "10+ domains and 50 to 100+ inboxes, split across Google Workspace and Microsoft 365",
      "Lead volume and campaigns scoped to your goals",
      "Multiple ideal customer profiles and markets",
      "White-label reporting for agencies",
      "Priority support and a dedicated Slack or WhatsApp channel",
      "Weekly strategy calls",
    ],
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
    name: "Infrastructure Setup, up to 15 inboxes",
    priceCents: 19900,
    unit: "one-time",
    relatedServiceSlug: "email-infrastructure",
  },
  {
    kind: "one-time-offer",
    id: "infra-setup-30",
    category: "infrastructure-setup",
    name: "Infrastructure Setup, up to 30 inboxes",
    priceCents: 34900,
    unit: "one-time",
    relatedServiceSlug: "email-infrastructure",
  },
  {
    kind: "one-time-offer",
    id: "infra-setup-60",
    category: "infrastructure-setup",
    name: "Infrastructure Setup, up to 60 inboxes",
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
    const priceDescription =
      entry.monthlyPriceCents === null
        ? "custom pricing"
        : `${formatPriceCents(entry.monthlyPriceCents)}/month + ${formatPriceCents(entry.setupPriceCents)} setup`;
    return `Interested in the ${entry.name} plan (${priceDescription}).`;
  }
  return `Interested in ${entry.name} (${formatPriceCents(entry.priceCents)}, ${entry.unit}).`;
}

/**
 * The lowest numeric monthly price across every managed plan, in integer
 * cents (e.g. the /agencies landing page's margin math) — reads from the
 * catalog rather than a hardcoded figure, so a future price change here
 * doesn't require a second edit elsewhere. A plan with
 * `monthlyPriceCents: null` ("Contact for price") is excluded from the
 * comparison, same as it's excluded from display everywhere else.
 */
export function getStartingMonthlyPriceCents(): number {
  const numericPrices = MANAGED_PLANS.map((plan) => plan.monthlyPriceCents).filter(
    (cents): cents is number => cents !== null,
  );
  return Math.min(...numericPrices);
}

/** `getStartingMonthlyPriceCents()`, formatted for "Plans start at X/month" copy. */
export function getStartingMonthlyPriceLabel(): string {
  return formatPriceCents(getStartingMonthlyPriceCents());
}

/** Builds the validated /contact query string for a catalog entry's
 * "Request a Proposal" CTA. */
export function getCatalogContactHref(entry: CatalogEntry): string {
  const params = new URLSearchParams({
    service: entry.relatedServiceSlug,
    plan: entry.id,
  });
  return `/contact?${params.toString()}`;
}
