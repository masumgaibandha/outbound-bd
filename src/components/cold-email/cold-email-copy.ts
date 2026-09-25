import type { AgencyHeroCopy } from "@/components/agencies/agency-hero-section";
import { EMAIL_MARKETING_FAQ, type FaqItem } from "@/components/agencies/agency-faq-section";
import {
  AGENCY_INCLUSIONS,
  AGENCY_LEAD_LIST_INCLUSION,
  type HowItWorksStep,
} from "@/components/agencies/agency-how-it-works-section";

// Exact wording from the /cold-email brief, so do not reword. No em or en
// dashes anywhere (see tests/lib/agency-copy-no-dashes.test.ts).

export const COLD_EMAIL_HERO_COPY: AgencyHeroCopy = {
  eyebrow: "Cold email outreach, done for you",
  headline: "More sales conversations, without chasing leads yourself.",
  subtext:
    "I set up and run cold email outreach for B2B businesses. Domains, inboxes, verified lead lists, copy and campaigns. You get replies from people who want to talk.",
  points: ["Month-to-month, no long contract", "Your domain stays safe", "Live in about 3 weeks"],
};

export const COLD_EMAIL_AUDIENCE = [
  "B2B companies selling to other businesses, with a deal size above $2,000",
  "Teams who need a predictable flow of sales calls, not more website traffic",
  "Founders doing outreach themselves and running out of hours",
] as const;

export const COLD_EMAIL_STEPS: readonly HowItWorksStep[] = [
  {
    number: "1",
    title: "We agree who to target.",
    description: "Your ideal customer, industry and location.",
  },
  {
    number: "2",
    title: "I build and run it.",
    description: "Domains, warm-up, verified lists, copy, sending and reply handling.",
  },
  {
    number: "3",
    title: "You get replies.",
    description: "Interested prospects land in your inbox or calendar.",
  },
];

// The /agencies checklist, with only the lead-list line addressed to the
// business itself instead of an agency's client.
export const COLD_EMAIL_INCLUSIONS: readonly string[] = AGENCY_INCLUSIONS.map((item) =>
  item === AGENCY_LEAD_LIST_INCLUSION ? "Verified lead lists matched to your ideal customer" : item,
);

export const COLD_EMAIL_FAQ_ITEMS: readonly FaqItem[] = [
  EMAIL_MARKETING_FAQ,
  {
    question: "Will this hurt my main domain?",
    answer:
      "No. I send from separate domains set up for outreach, so your main domain is never used.",
  },
  {
    question: "How soon do campaigns start?",
    answer:
      "New domains need 2 to 3 weeks of warm-up, so the first emails usually go out in week 3.",
  },
  {
    question: "Is there a contract?",
    answer:
      "No. It's month-to-month. The setup fee is paid upfront and covers the domains, inboxes and warm-up.",
  },
  {
    question: "Do you guarantee meetings?",
    answer:
      "No. I guarantee the setup and the work. Results depend on the offer and the market, and I'll tell you honestly if I think cold email isn't a good fit for you.",
  },
  {
    question: "How do I pay?",
    answer:
      "By invoice, once we agree on the scope. International payments are fine, and I'll send the payment options with your invoice.",
  },
];
