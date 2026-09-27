import type { ColdEmailTitledItem } from "@/components/cold-email/cold-email-copy";

// Homepage-only copy. No em or en dashes anywhere (see
// tests/lib/agency-copy-no-dashes.test.ts).

export const HOME_HERO_SECONDARY_CTA = {
  href: "/cold-email",
  label: "See how it works",
} as const;

// A shorter take on the /cold-email "Why most cold email fails" section,
// written for the homepage rather than copied from it.
export const HOME_WHY_FAILS = {
  eyebrow: "Why cold email fails",
  heading: "Most campaigns fail before anyone reads the offer",
  subtext: "It is rarely the product. It is usually one of these six things.",
  items: [
    {
      title: "Unverified lists",
      body: "Invalid and risky addresses bounce, and bounces burn a sending domain fast. We verify every list before the first email goes out.",
    },
    {
      title: "Loose targeting",
      body: "Emailing everyone with the right job title wastes volume on people who will never buy. Tight targeting means fewer sends and more replies.",
    },
    {
      title: "Generic messaging",
      body: "Templated emails read like templates. Every sequence is written for one audience and tested in several variants.",
    },
    {
      title: "Weak domain and inbox setup",
      body: "Sending from your main domain, or without SPF, DKIM and DMARC, puts your company email at risk. Outreach runs on separate, authenticated domains.",
    },
    {
      title: "Careless sending",
      body: "Too much volume per inbox and no ongoing warm-up teach providers to filter you. We cap volume and spread it across warmed inboxes.",
    },
    {
      title: "Nobody watching",
      body: "Deliverability drifts quietly. We track bounces, replies and inbox placement continuously and fix problems before a domain burns.",
    },
  ] satisfies readonly ColdEmailTitledItem[],
} as const;

export const HOME_PRICING = {
  eyebrow: "Pricing",
  heading: "Transparent starting prices",
  /** Reads the starting price from the catalog, never a hardcoded figure. */
  startingLine: (price: string) => `Managed programs from ${price} a month, plus a one-time setup.`,
  notIncluded:
    "Domains, mailboxes and sending tools are not included; their providers bill you directly.",
  ctaLabel: "See full pricing",
  ctaHref: "/pricing",
} as const;
