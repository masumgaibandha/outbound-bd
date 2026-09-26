import type { StaticImageData } from "next/image";

import campaignResultSmartlead from "@/assets/results/campaign-result-smartlead.png";
import inboxPlacementCard from "@/assets/results/cold-email-cards/inbox-placement-card.png";
import instantlyCampaignAtScaleCard from "@/assets/results/cold-email-cards/instantly-campaign-at-scale-card.png";
import smartleadWarmupCard from "@/assets/results/cold-email-cards/smartlead-warmup-card.png";
import inboxPlacementTestResult2 from "@/assets/results/inbox-placement-test-result2.png";
import instantlyCampaignResult2 from "@/assets/results/instantly-campaign-result-2.png";
import instantly20250805 from "@/assets/results/instantly_2025-08-05.png";
import upworkFeedbackCropped from "@/assets/results/upwork-feedback-cropped.png";
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

export interface ColdEmailProofItem {
  id: string;
  /** Small orange label above the screenshot, also shown in the lightbox header. */
  label: string;
  /** The full screenshot, always what the lightbox shows. */
  src: StaticImageData;
  /**
   * A tighter crop of the same screenshot for the card, so its key figures
   * are readable at half page width on desktop. Only app sidebars, nav tabs
   * and empty chrome are cut; the full image is one click away.
   */
  cardSrc?: StaticImageData;
  alt: string;
  /** Plain text; figures in it are bolded at render time (see ProofCaption). */
  caption: string;
  note?: string;
}

// Same standing rule as campaign-evidence-data.ts: a screenshot with a
// redacted dollar figure always says so, so it never looks like the platform
// itself left the figure out.
const REDACTION_NOTE = "Platform-assigned monetary value hidden because it is not verified revenue.";

// Captions verified against each screenshot's own on-screen labels: the
// 127,149 figure is Instantly's "Sequence started" count over a "Last 4
// weeks" filter, and the Smartlead image is a warm-up report, not campaign
// performance.
export const COLD_EMAIL_PROOF_ITEMS: readonly ColdEmailProofItem[] = [
  {
    id: "instantly-2025-08-05",
    label: "Campaign performance, Instantly",
    src: instantly20250805,
    alt: "Instantly campaign report showing 5.6K emails sent, a platform-reported 83.9% open rate, a 2.7% reply rate and 25 opportunities",
    caption:
      "5.6K emails sent, 83.9% open rate, 2.7% reply rate, 25 sales opportunities over roughly three months.",
    note: REDACTION_NOTE,
  },
  {
    id: "inbox-placement-test-result2",
    label: "Inbox placement test, Instantly",
    src: inboxPlacementTestResult2,
    cardSrc: inboxPlacementCard,
    alt: "Instantly inbox placement test showing 3,907 of 3,975 received test emails in the inbox (98.29%), with a breakdown by email provider",
    caption: "3,907 of 3,975 test emails reached the inbox in this specific test.",
  },
  {
    id: "instantly-campaign-result-2",
    label: "Campaign at scale, Instantly",
    src: instantlyCampaignResult2,
    cardSrc: instantlyCampaignAtScaleCard,
    alt: "Instantly campaign report showing 127,149 sequences started and 140 opportunities over the last 4 weeks",
    caption: "127,149 sequences started, generating 140 sales opportunities.",
    note: REDACTION_NOTE,
  },
  {
    id: "campaign-result-smartlead",
    label: "Inbox warm-up report, Smartlead",
    src: campaignResultSmartlead,
    cardSrc: smartleadWarmupCard,
    alt: "Smartlead warm-up report showing 42 of 42 warm-up emails landing in the inbox and 0 saved from spam",
    caption: "42 of 42 warm-up emails landed in the inbox, with 0 saved from spam.",
  },
];

export const COLD_EMAIL_PROOF_DISCLAIMER =
  "These are specific client results, not a guaranteed or typical outcome for every campaign or market.";

// A cropped copy of upwork_Feedback_2.png with the hourly rates and earnings
// rows removed; job titles, star ratings and both quotes are untouched.
export const COLD_EMAIL_FEEDBACK_ITEM: ColdEmailProofItem = {
  id: "upwork-feedback",
  label: "Verified client feedback on Upwork",
  src: upworkFeedbackCropped,
  alt: "Upwork client feedback listing five cold email jobs rated 5.0 and 4.4 stars, including two client quotes praising the cold email work",
  caption: "Job titles, star ratings and client comments from the Upwork profile.",
};
