export type FaqCategoryId =
  | "services"
  | "process"
  | "timelines"
  | "deliverability"
  | "data-ownership"
  | "compliance"
  | "support"
  | "results";

export const FAQ_CATEGORIES: { id: FaqCategoryId; label: string }[] = [
  { id: "services", label: "Services" },
  { id: "process", label: "Process" },
  { id: "timelines", label: "Timelines" },
  { id: "deliverability", label: "Deliverability" },
  { id: "data-ownership", label: "Data ownership" },
  { id: "compliance", label: "Compliance" },
  { id: "support", label: "Support" },
  { id: "results", label: "Results expectations" },
];

export type FaqEntry = {
  id: string;
  category: FaqCategoryId;
  question: string;
  answer: string;
};

// Single source of truth for FAQ content. The homepage teaser and individual
// service pages pull specific entries from here (via getFaqsByIds) rather
// than hardcoding their own copies, so the same question never has two
// different answers in different places on the site.
export const FAQS: FaqEntry[] = [
  {
    id: "services-whats-included",
    category: "services",
    question: "What exactly is included in an Outbound BD program?",
    answer:
      "Every engagement combines targeting, sending infrastructure, copywriting, campaign execution, and reporting as one connected program, rather than separate vendors handling each piece. See the Services pages for what's included in each discipline.",
  },
  {
    id: "services-which-to-start-with",
    category: "services",
    question: "Which service should I start with if I'm not sure?",
    answer:
      "Most clients start with Cold Email Outreach, which bundles targeting, infrastructure, copy, and reply handling into one program. If you already have infrastructure or lists in place, Email Deliverability or Lead Generation alone may fit better — tell us your situation on a strategy call and we'll point you to the right service.",
  },
  {
    id: "process-copywriting",
    category: "process",
    question: "Do you write the copy, or do we?",
    answer:
      "Our strategists write every sequence, working from your positioning, prior customers, and voice. You review and approve messaging before anything goes live.",
  },
  {
    id: "process-stages",
    category: "process",
    question: "What does the process look like from kickoff to launch?",
    answer:
      "Every engagement follows the same stages: Discover (map your ICP and offer), Build (source your list, stand up infrastructure, write sequences), Launch (go live on a warmed, monitored setup), and Optimize & Report (test against real reply data and send weekly readouts). The How It Works page walks through each stage in detail.",
  },
  {
    id: "timelines-results-speed",
    category: "timelines",
    question: "How quickly can we expect results?",
    answer:
      "Most programs launch within two to three weeks of kickoff, covering ICP definition, list build, and infrastructure warm-up. Reply and meeting volume typically builds over the following weeks as sequences are tested and refined — the exact pace depends on your market and list size.",
  },
  {
    id: "timelines-warmup",
    category: "timelines",
    question: "How long does mailbox warm-up take?",
    answer:
      "Warm-up is staged gradually rather than run to a fixed calendar date — mailboxes move to full volume once sending signals show they're ready.",
  },
  {
    id: "deliverability-protect-reputation",
    category: "deliverability",
    question: "How do you protect our sender reputation?",
    answer:
      "Every client sends from dedicated domains and mailboxes, never a shared pool. We stage warm-up carefully, monitor bounce and spam-complaint rates daily, and pull back volume automatically if deliverability signals dip.",
  },
  {
    id: "deliverability-blocklist",
    category: "deliverability",
    question: "What happens if a domain gets blocklisted?",
    answer:
      "We monitor blocklist status continuously. If an issue appears, that domain's volume is paused and remediated rather than left to keep sending.",
  },
  {
    id: "data-ownership-who-owns",
    category: "data-ownership",
    question: "Who owns the prospect lists and data you build for us?",
    answer:
      "Lists and data built for your engagement are yours — delivered in your preferred format (CRM export, spreadsheet, or direct integration) so they stay usable even outside our platform relationships.",
  },
  {
    id: "data-ownership-source",
    category: "data-ownership",
    question: "Where does your prospect data come from?",
    answer:
      "We research and verify contacts against public and licensed data sources, filtered to your documented ICP — never a single purchased list resold as-is.",
  },
  {
    id: "compliance-gdpr-canspam",
    category: "compliance",
    question: "Is cold email compliant with GDPR and CAN-SPAM?",
    answer:
      "Sequences are built around legitimate-interest targeting, clear sender identification, and one-click opt-out from the first draft, adapted by region as needed.",
  },
  {
    id: "compliance-data-privacy",
    category: "compliance",
    question: "How is data privacy handled during prospecting?",
    answer:
      "Sourcing and handling follow GDPR and CCPA principles, with region-specific adjustments where your target market requires it.",
  },
  {
    id: "support-crm-integration",
    category: "support",
    question: "Do you work with our existing CRM?",
    answer:
      "Yes. We integrate with the CRM and calendar tools your team already uses — booked meetings and reply data are pushed to your pipeline, not trapped in a separate dashboard.",
  },
  {
    id: "support-who-runs-account",
    category: "support",
    question: "Who will we be working with day to day?",
    answer:
      "Every account is run by an experienced outbound operator who understands your market, not a rotating cast of contractors — you have a direct line to the person actually running your program.",
  },
  {
    id: "support-pause-adjust",
    category: "support",
    question: "What if we need to pause or adjust the program mid-engagement?",
    answer:
      "Reach out any time — sending volume and sequences can be paused or adjusted as your priorities change. We'd rather adjust the plan than keep sending on autopilot.",
  },
  {
    id: "results-qualified-conversation",
    category: "results",
    question: "What counts as a “qualified conversation”?",
    answer:
      "A reply from someone who matches your ideal-customer profile and has shown real interest — not an auto-reply or a polite decline. We agree on qualification criteria with you before a single email goes out.",
  },
  {
    id: "results-guarantee",
    category: "results",
    question: "Can you guarantee a specific number of meetings or replies?",
    answer:
      "No — reply and meeting volume depends on your market, offer, and list size, and we won't promise a fixed number regardless of fit. What we do commit to is transparent weekly reporting so you always know what's working and why.",
  },
  {
    id: "results-case-studies",
    category: "results",
    question: "Do you have case studies or client results we can see?",
    answer:
      "Not yet published — we only share performance figures once a client has reviewed and approved them for release. You can see the format each case study will follow on the homepage's Results section, and we're happy to discuss reference conversations directly on a call.",
  },
];

export function getFaqsByIds(
  ids: string[],
): { question: string; answer: string }[] {
  return ids.map((id) => {
    const entry = FAQS.find((faq) => faq.id === id);
    if (!entry) {
      throw new Error(`Unknown FAQ id: ${id}`);
    }
    return { question: entry.question, answer: entry.answer };
  });
}

export function getFaqsByCategory(category: FaqCategoryId): FaqEntry[] {
  return FAQS.filter((faq) => faq.category === category);
}
