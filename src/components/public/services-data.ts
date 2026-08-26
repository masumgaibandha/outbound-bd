import { getFaqsByIds } from "@/components/public/faq-data";

export type ServiceSlug =
  | "cold-email-outreach"
  | "lead-generation"
  | "email-infrastructure"
  | "email-deliverability";

export type ServiceDefinition = {
  slug: ServiceSlug;
  navLabel: string;
  shortDescription: string;
  metaTitle: string;
  metaDescription: string;
  heroTitle: string;
  heroIntro: string;
  problems: { title: string; description: string }[];
  goodFit: string[];
  notFit: string[];
  deliverables: { title: string; description: string }[];
  process: { title: string; description: string }[];
  requirements: string[];
  faqs: { question: string; answer: string }[];
};

export const SERVICES: ServiceDefinition[] = [
  {
    slug: "cold-email-outreach",
    navLabel: "Cold Email Outreach",
    shortDescription:
      "Fully managed cold email programs that turn a defined ICP into booked sales conversations.",
    metaTitle: "Cold Email Outreach",
    metaDescription:
      "Managed cold email programs — strategy, copywriting, sending, and reply handling — run end to end by senior operators for B2B teams.",
    heroTitle: "Cold Email Outreach",
    heroIntro:
      "A fully managed cold email program that turns a defined ideal-customer profile into booked sales conversations. We handle targeting, copy, sending infrastructure, and reply triage as one connected system, not four disconnected vendors.",
    problems: [
      {
        title: "Pipeline depends too heavily on inbound",
        description:
          "Referrals and inbound leads are unpredictable. Cold email adds a channel your team can plan revenue around.",
      },
      {
        title: "A past attempt hurt your domain",
        description:
          "Generic blasts from a shared or unwarmed domain can tank deliverability for months. We rebuild on isolated, dedicated infrastructure.",
      },
      {
        title: "No bandwidth to run it properly",
        description:
          "Research, copy, sending, and monitoring each take real time. Doing all four well at once is a full-time job most teams don't have spare.",
      },
      {
        title: "Past agencies sent generic blasts",
        description:
          "Unqualified volume wastes your sales team's time. We triage every reply before it reaches your calendar.",
      },
    ],
    goodFit: [
      "You sell a defined B2B product or service with a clear ideal-customer profile",
      "You have a repeatable sales process ready to receive booked meetings",
      "You want a managed program run by strategists, not software you operate yourself",
    ],
    notFit: [
      "You don't yet have a clear target customer or offer — positioning needs to come first",
      "You sell direct to consumers rather than businesses",
      "You're looking for a fixed volume or reply-rate commitment regardless of market fit",
    ],
    deliverables: [
      {
        title: "ICP & messaging brief",
        description:
          "A written definition of who we're targeting and why your offer fits their problem.",
      },
      {
        title: "Verified prospect list",
        description:
          "Contacts researched and matched to your ICP — no purchased or recycled data.",
      },
      {
        title: "Dedicated sending infrastructure",
        description:
          "Domains and mailboxes isolated from your primary company email, warmed before use.",
      },
      {
        title: "Multi-step sequences",
        description:
          "Copy written by senior strategists, reviewed and approved by you before anything sends.",
      },
      {
        title: "Reply triage & booking",
        description:
          "Every reply is read by a human. Qualified conversations go straight onto your calendar.",
      },
      {
        title: "Weekly reporting readout",
        description:
          "A plain-English summary of what went out, what came back, and what's booked.",
      },
    ],
    process: [
      {
        title: "Discover",
        description:
          "We map your ICP, offer, and competitive position in a working session with your team.",
      },
      {
        title: "Build",
        description:
          "We source and verify your prospect list, stand up sending infrastructure, and write your first sequences.",
      },
      {
        title: "Launch",
        description:
          "Sequences go live on a warmed, monitored inbox setup, tracked against deliverability and reply signals.",
      },
      {
        title: "Optimize & report",
        description:
          "We test angles against real reply data and send you a weekly readout of what's working.",
      },
    ],
    requirements: [
      "Willingness to set up a sending domain separate from your primary company domain",
      "A point of contact who can approve messaging before it goes live",
      "Background on your ICP, past customers, and positioning",
      "CRM or calendar access so booked meetings land in your pipeline",
    ],
    faqs: [
      getFaqsByIds(["timelines-results-speed"])[0],
      getFaqsByIds(["process-copywriting"])[0],
      {
        question: "How many sequences run at once?",
        answer:
          "It depends on how many ICP segments you have. Most programs start with one or two core sequences and expand once we know what resonates.",
      },
      getFaqsByIds(["compliance-gdpr-canspam"])[0],
    ],
  },
  {
    slug: "lead-generation",
    navLabel: "Lead Generation",
    shortDescription:
      "ICP definition and verified, enriched prospect lists — sourced and refreshed on an ongoing basis, not a one-time export.",
    metaTitle: "Lead Generation",
    metaDescription:
      "B2B lead generation: ICP definition, verified and enriched prospect lists, and ongoing data hygiene, matched to your CRM.",
    heroTitle: "Lead Generation",
    heroIntro:
      "Verified, enriched prospect lists matched to a clearly defined ideal-customer profile — sourced on an ongoing basis and kept clean as your market shifts, not a one-time export that goes stale in a quarter.",
    problems: [
      {
        title: "Sales wastes time on stale lists",
        description:
          "Unqualified or outdated contacts mean reps spend more time filtering than selling.",
      },
      {
        title: "Purchased data hurts deliverability",
        description:
          "Scraped or bought lists carry high bounce rates that put your sending domain at risk.",
      },
      {
        title: "No consistent targeting definition",
        description:
          "Without a documented ICP, every rep or campaign targets slightly differently, and results are hard to compare.",
      },
      {
        title: "Manual prospecting doesn't scale",
        description:
          "Hand-building lists in spreadsheets can't keep pace with a growing pipeline target.",
      },
    ],
    goodFit: [
      "You want help defining (or refining) a clear ICP across firmographics and technographics",
      "You need an ongoing, refreshed pipeline of verified contacts, not a single static export",
      "You're willing to share closed-won and closed-lost data to sharpen targeting",
    ],
    notFit: [
      "You only need a one-time list export with no ongoing refinement",
      "Your addressable market is extremely narrow with little to no online footprint",
    ],
    deliverables: [
      {
        title: "ICP & persona definition",
        description:
          "A documented profile of the accounts and buyers worth targeting.",
      },
      {
        title: "Verified contact lists",
        description:
          "Firmographic- and technographic-filtered contacts, checked for accuracy before delivery.",
      },
      {
        title: "Ongoing list refresh",
        description:
          "Lists updated as your ICP, market, or product shifts — not delivered once and forgotten.",
      },
      {
        title: "Data hygiene",
        description:
          "Deduplication, verification, and suppression-list management on every batch.",
      },
      {
        title: "CRM-matched handoff",
        description:
          "Delivered in the format and fields your CRM already expects.",
      },
      {
        title: "Enrichment on request",
        description:
          "Additional firmographic or technographic fields added as your targeting criteria evolve.",
      },
    ],
    process: [
      {
        title: "Define ICP",
        description:
          "We work with you to document firmographic, technographic, and behavioral targeting criteria.",
      },
      {
        title: "Source & verify",
        description:
          "Contacts are researched and checked for accuracy before they reach your list.",
      },
      {
        title: "Enrich & segment",
        description:
          "Lists are enriched with the fields your team needs and segmented for targeting.",
      },
      {
        title: "Deliver & refresh",
        description:
          "Lists are handed off in your preferred format and refreshed on an ongoing cadence.",
      },
    ],
    requirements: [
      "Access to existing CRM data (closed-won/lost) where available, to inform targeting",
      "Sign-off on ICP criteria before sourcing begins",
      "Your preferred handoff format (CRM export, spreadsheet, or direct integration)",
      "A named point of contact to review the first delivered batch",
    ],
    faqs: [
      {
        question: "Where does the data come from?",
        answer:
          "We research and verify contacts against public and licensed data sources, filtered to your documented ICP — never a single purchased list resold as-is.",
      },
      {
        question: "How is data privacy handled?",
        answer:
          "Sourcing and handling follow GDPR and CCPA principles, with region-specific adjustments where your target market requires it.",
      },
      {
        question: "How often are lists refreshed?",
        answer:
          "Refresh cadence is agreed with you up front based on how quickly your market and ICP change — this is set per engagement, not fixed.",
      },
      {
        question: "Can this feed directly into cold email sending?",
        answer:
          "Yes — lists built here are the same ones used in our Cold Email Outreach service, or can be handed off to your existing sending setup.",
      },
    ],
  },
  {
    slug: "email-infrastructure",
    navLabel: "Email Infrastructure",
    shortDescription:
      "Dedicated sending domains, mailboxes, and authentication setup — isolated from your primary domain and warmed before use.",
    metaTitle: "Email Infrastructure",
    metaDescription:
      "Cold email sending infrastructure: dedicated domains and mailboxes, SPF/DKIM/DMARC setup, staged warm-up, and monitored rotation.",
    heroTitle: "Email Infrastructure",
    heroIntro:
      "Dedicated sending domains and mailboxes, properly authenticated and warmed, isolated from your primary company domain — the technical foundation cold email depends on, set up once and monitored continuously.",
    problems: [
      {
        title: "Your primary domain is at risk",
        description:
          "Sending cold outreach from your main company domain can drag down deliverability for every email you send, including support and sales.",
      },
      {
        title: "DIY setup is easy to get wrong",
        description:
          "Misconfigured SPF, DKIM, or DMARC records quietly tank inbox placement with no obvious warning sign.",
      },
      {
        title: "Volume outpaces infrastructure",
        description:
          "Scaling sends without matching mailbox and domain capacity pushes more email into spam.",
      },
      {
        title: "No visibility until it's a problem",
        description:
          "Without ongoing monitoring, domain health issues are usually caught only after reply volume has already dropped.",
      },
    ],
    goodFit: [
      "You're running, or planning, outbound at meaningful volume across multiple mailboxes",
      "You want sending infrastructure fully isolated from your core company email",
      "You need authentication (SPF/DKIM/DMARC) set up correctly from the start",
    ],
    notFit: [
      "You send only transactional or marketing newsletter email — that's a different discipline",
      "You want a one-time audit with no ongoing management (see Email Deliverability instead)",
    ],
    deliverables: [
      {
        title: "Dedicated domains & mailboxes",
        description: "Sending infrastructure isolated from your primary domain.",
      },
      {
        title: "SPF, DKIM & DMARC setup",
        description: "Authentication records configured and verified before sending starts.",
      },
      {
        title: "Staged warm-up",
        description: "Mailboxes are warmed gradually before sequences go live at full volume.",
      },
      {
        title: "Inbox rotation & pacing",
        description: "Volume distributed across mailboxes to keep sending patterns natural.",
      },
      {
        title: "Domain health monitoring",
        description: "Ongoing checks for blocklist status and authentication drift.",
      },
      {
        title: "Capacity planning",
        description: "Mailbox and domain counts sized to your target sending volume.",
      },
    ],
    process: [
      {
        title: "Provision",
        description:
          "We register or connect the domains and mailboxes your sending volume requires.",
      },
      {
        title: "Authenticate",
        description:
          "SPF, DKIM, and DMARC records are configured and verified for every domain.",
      },
      {
        title: "Warm up",
        description:
          "Mailboxes are staged through a gradual warm-up period before full sequence volume begins.",
      },
      {
        title: "Monitor & rotate",
        description:
          "We track domain health continuously and rotate sending volume to keep patterns natural.",
      },
    ],
    requirements: [
      "Ability to register new sending domains, or delegate DNS access for existing ones",
      "DNS access, or a technical contact who can implement authentication records",
      "Time for staged warm-up before full send volume begins",
      "Sign-off on mailbox and domain counts for your target volume",
    ],
    faqs: [
      {
        question: "Why not just send from our main domain?",
        answer:
          "Cold outreach carries more deliverability risk than everyday business email. Isolating it on dedicated domains protects your primary domain's reputation if anything goes wrong.",
      },
      {
        question: "How long does warm-up take?",
        answer:
          "Warm-up is staged gradually rather than run to a fixed calendar date — mailboxes move to full volume once sending signals show they're ready.",
      },
      {
        question: "What happens if a domain gets blocklisted?",
        answer:
          "We monitor blocklist status continuously. If an issue appears, that domain's volume is paused and remediated rather than left to keep sending.",
      },
      {
        question: "How many mailboxes do we need?",
        answer:
          "It depends on your target send volume and list size — we size mailbox and domain counts to your goals rather than a one-size-fits-all number.",
      },
    ],
  },
  {
    slug: "email-deliverability",
    navLabel: "Email Deliverability",
    shortDescription:
      "Ongoing monitoring and protection of sender reputation for domains already sending — diagnosis, remediation, and continuous tracking.",
    metaTitle: "Email Deliverability",
    metaDescription:
      "Ongoing cold email deliverability monitoring: audits, bounce and spam-complaint tracking, blocklist monitoring, and remediation.",
    heroTitle: "Email Deliverability",
    heroIntro:
      "Ongoing monitoring and protection of sender reputation for domains that are already sending — so a program that's landing in the inbox today keeps landing there next quarter, not just at launch.",
    problems: [
      {
        title: "Sequences that used to land now don't",
        description:
          "Inbox placement can degrade gradually, with no single obvious cause, until reply rates drop off.",
      },
      {
        title: "Bounce or complaint rates are climbing",
        description:
          "Rising negative signals without a clear diagnosis put your whole sending program at risk.",
      },
      {
        title: "A prior vendor damaged reputation",
        description:
          "Recovering domain trust after a previous in-house or agency mistake takes a deliberate remediation plan, not just pausing and hoping.",
      },
      {
        title: "No ongoing monitoring in place",
        description:
          "Without continuous tracking, deliverability problems are usually caught only after volume has already dropped.",
      },
    ],
    goodFit: [
      "You're already sending cold email — through us or in-house — and need deliverability specifically diagnosed or protected",
      "You want continuous monitoring rather than a one-time fix",
      "You're willing to share sending logs and platform access for an accurate audit",
    ],
    notFit: [
      "You're not yet sending any cold email — see Email Infrastructure to get set up first",
      "The issue is primarily about copy or targeting rather than technical deliverability",
    ],
    deliverables: [
      {
        title: "Deliverability audit",
        description:
          "A full review of domains, mailboxes, and authentication records against current best practice.",
      },
      {
        title: "Bounce & complaint monitoring",
        description:
          "Ongoing tracking with automatic volume pull-back if negative signals rise.",
      },
      {
        title: "Blocklist monitoring",
        description: "Continuous checks across major blocklists, with alerts on any listing.",
      },
      {
        title: "Remediation plan",
        description:
          "Specific fixes for authentication, warm-up pacing, or content issues identified in the audit.",
      },
      {
        title: "Inbox placement checks",
        description: "Ongoing visibility into where your sends are actually landing.",
      },
      {
        title: "Domain health reporting",
        description: "Regular reporting on the state of every sending domain.",
      },
    ],
    process: [
      {
        title: "Audit",
        description:
          "We review your current domains, mailboxes, authentication, and send history.",
      },
      {
        title: "Diagnose",
        description:
          "We identify the specific cause behind declining reply or inbox-placement signals.",
      },
      {
        title: "Remediate",
        description:
          "We fix authentication, adjust pacing, and re-warm affected mailboxes as needed.",
      },
      {
        title: "Monitor continuously",
        description:
          "Bounce, complaint, and blocklist signals are tracked on an ongoing basis, not just at the start.",
      },
    ],
    requirements: [
      "Access to sending platform and domain settings for an accurate audit",
      "Recent send history or logs, where available (bounces, complaints, replies)",
      "Willingness to pause or reduce volume temporarily if remediation requires it",
      "A technical contact who can implement DNS or authentication changes",
    ],
    faqs: [
      {
        question: "How quickly can you diagnose an issue?",
        answer:
          "Initial audit findings are typically available within the first week of access, though the underlying cause and the right fix depend on what the audit uncovers.",
      },
      {
        question: "What usually causes deliverability to drop?",
        answer:
          "Common causes include authentication drift, sending volume outpacing mailbox warm-up, rising spam complaints, or a domain landing on a blocklist. The audit identifies which apply to you.",
      },
      {
        question: "Does this include a review of our email copy?",
        answer:
          "The core focus is technical deliverability, but if content patterns are contributing to spam placement, that's flagged as part of the audit.",
      },
      {
        question: "Is monitoring ongoing or a one-time check?",
        answer:
          "Monitoring runs continuously for the duration of the engagement — bounce, complaint, and blocklist signals are tracked on an ongoing basis, not just at kickoff.",
      },
    ],
  },
];

export function getServiceBySlug(slug: string): ServiceDefinition | undefined {
  return SERVICES.find((service) => service.slug === slug);
}
