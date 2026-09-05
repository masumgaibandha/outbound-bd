import campaignResultSmartlead from "@/assets/results/campaign-result-smartlead.png";
import inboxPlacementTestResult2 from "@/assets/results/inbox-placement-test-result2.png";
import instantlyCampaignResult2 from "@/assets/results/instantly-campaign-result-2.png";
import instantlyResult98 from "@/assets/results/instantly-result_98.png";
import instantly20250805 from "@/assets/results/instantly_2025-08-05.png";
import { classDates } from "@/lib/masterclass/constants";
import { formatClassDatesBn } from "@/lib/masterclass/format";
import type {
  CurriculumDay,
  FaqItem,
  ManualPaymentMethodCopy,
  MasterclassConfig,
  OfferDetail,
  ProfileLink,
  ProofAsset,
  TrustMetric,
  WorkflowStep,
} from "@/types/masterclass";

/** Derived once from `classDates` — see `formatClassDatesBn()`'s doc comment for why this is never a re-typed literal. */
const classDatesLabelBn = formatClassDatesBn(classDates.day1, classDates.day2);

/*
 * `checkoutEnabled: true` — a real payment path exists now (manual
 * bKash/Nagad/Rocket, verified by an operator; see `Registration.tsx` and
 * `src/lib/masterclass/verify-service.ts`). Price, dates, and batch identity
 * live in `src/lib/masterclass/constants.ts` — the server-only source of
 * truth this file's copy is written to describe, never to duplicate.
 */
export const masterclassConfig: MasterclassConfig = {
  checkoutEnabled: true,
};

export const masterclassMeta = {
  seoTitle: "Lead Generation ও Cold Email Outreach মাস্টারক্লাস | Outbound BD",
  metaDescription:
    "২ দিনের LIVE মাস্টারক্লাসে শিখুন বাস্তব B2B Lead Generation, prospect list building ও Cold Email Outreach workflow — ১১ বছরের অভিজ্ঞতা থেকে।",
} as const;

export const header = {
  wordmark: "Outbound BD",
  ctaLabel: "রেজিস্ট্রেশন করুন",
} as const;

export const hero = {
  eyebrow: "প্রথমবারের মতো ২ দিনের LIVE মাস্টারক্লাস",
  headline:
    "রাতারাতি লাখ টাকার গল্প নয়—শিখুন বাস্তব Lead Generation ও Cold Email Outreach",
  description:
    "১১ বছরের বাস্তব অভিজ্ঞতা এবং আন্তর্জাতিক ক্লায়েন্টদের সঙ্গে কাজের বাস্তব workflow থেকে শিখুন B2B Lead Generation, prospect list building, cold email infrastructure ও campaign setup।",
  credibilityLine:
    "Top Rated Upwork Freelancer • $100K+ Earnings • ২৪৪টি কাজ • ২২,৩০২+ ঘণ্টা",
  /* No embedded price — components append `formatBDT(resolvePriceBDT())` after this label, so the number is never re-typed here. */
  primaryCtaLabel: "এখনই ভর্তি হোন",
  secondaryCta: "কী কী শিখবেন দেখুন",
  instructorImageAlt:
    "আব্দুল্লাহ আল মাসুম, Cold Email Outreach ও Lead Generation বিশেষজ্ঞ",
} as const;

/* The date label is derived from `classDates` above; only the (unchanging) 9pm time is a literal here. */
export const offerDetails: readonly OfferDetail[] = [
  { label: classDatesLabelBn },
  { label: "প্রতিদিন রাত ৯টা" },
  { label: "লাইভ অনলাইন ক্লাস" },
  { label: "লাইভ প্রশ্নোত্তর পর্ব" },
];

/* Same figures as the hero credibility line, restated as a scannable strip. */
export const trustMetrics: readonly TrustMetric[] = [
  { value: "Top Rated", label: "Upwork স্ট্যাটাস" },
  { value: "$100K+", label: "Upwork lifetime earnings" },
  { value: "২৪৪+", label: "সম্পন্ন প্রজেক্ট" },
  { value: "২২,৩০২+", label: "কাজের ঘণ্টা" },
  { value: "৯১%", label: "Job Success Score" },
];

export const expectationStory = {
  label: "শুরুতেই স্পষ্ট কথা",
  heading: "এটা কোনো “রাতারাতি ধনী হওয়ার” কোর্স নয়",
  paragraphs: [
    "অনলাইনে অনেক বিজ্ঞাপনে বলা হয় দুই দিনেই লাখ টাকা আয় শুরু হয়ে যাবে। বাস্তবতা এমন নয়। Cold Email Outreach ও Lead Generation একটি বাস্তব দক্ষতা—এবং যেকোনো বাস্তব দক্ষতার মতোই এখানে সময়, চর্চা এবং ধৈর্য লাগে।",
    "এই মাস্টারক্লাসে কোনো income বা client পাওয়ার guarantee দেওয়া হয় না। যা দেওয়া হয় তা হলো একটি সঠিক foundation, একটি সম্পূর্ণ workflow এবং একটি বাস্তব roadmap—যা দিয়ে আপনি নিজে চর্চা করে এগিয়ে যেতে পারবেন।",
    "Deliverability ঠিক রাখা, সঠিক prospect খুঁজে বের করা এবং campaign optimize করা—এই তিনটি বিষয়ে দক্ষ হতে বাস্তব কাজের অভিজ্ঞতা প্রয়োজন। দুই দিনের ক্লাস আপনাকে সেই পথে সঠিকভাবে শুরু করিয়ে দেবে।",
  ],
} as const;

export const outcomes = {
  label: "মাস্টারক্লাস শেষে যা বুঝতে পারবেন",
  heading: "দুই দিন শেষে আপনি যা নিয়ে বাড়ি ফিরবেন",
  items: [
    "B2B Lead Generation আসলে কী এবং ক্লায়েন্টরা কেন এই service-এর জন্য টাকা দেয়",
    "একটি সঠিক Ideal Customer Profile বা ICP কীভাবে নির্ধারণ করতে হয়",
    "সঠিক decision-maker খুঁজে বের করে একটি client-ready prospect list তৈরির সম্পূর্ণ প্রক্রিয়া",
    "একটি cold email sending infrastructure—domain, inbox, SPF, DKIM, DMARC—কীভাবে সঠিকভাবে সেট আপ করতে হয়",
    "Deliverability বজায় রেখে কীভাবে একটি cold email campaign লঞ্চ ও পরিচালনা করতে হয়",
    "এই পুরো skill set-কে freelance service হিসেবে উপস্থাপন করার একটি বাস্তব roadmap",
  ],
} as const;

export const curriculumNote =
  "দুই দিনের এই ক্লাস আপনাকে সঠিক foundation ও একটি সম্পূর্ণ roadmap দেবে। কিন্তু deliverability, prospect research এবং campaign optimization-এ দক্ষ হতে চাই ধারাবাহিক চর্চা।";

export const curriculumDays: readonly CurriculumDay[] = [
  {
    id: "day-1",
    dayLabel: "প্রথম দিন",
    heading: "প্রথম দিন—Lead Generation ও Prospect List Building",
    items: [
      "Lead Generation কী এবং ক্লায়েন্ট কেন এই service-এর জন্য টাকা দেয়",
      "Niche এবং Ideal Customer Profile বা ICP নির্ধারণ",
      "Target company এবং সঠিক decision-maker খুঁজে বের করা",
      "Prospect-এর নাম, পদবি, email ও প্রয়োজনীয় তথ্য সংগ্রহ",
      "Email verification এবং bounce risk কমানো",
      "একটি পরিচ্ছন্ন client-ready prospect list তৈরি",
      "হাতে-কলমে একটি বাস্তব lead list তৈরি",
      "এই দক্ষতাকে freelance service হিসেবে উপস্থাপনের roadmap",
    ],
  },
  {
    id: "day-2",
    dayLabel: "দ্বিতীয় দিন",
    heading: "দ্বিতীয় দিন—সম্পূর্ণ Cold Email Outreach System",
    items: [
      "Outreach domain ও inbox-এর ভূমিকা",
      "Google Workspace এবং Microsoft 365 inbox setup process",
      "SPF, DKIM ও DMARC-এর মৌলিক বিষয়",
      "Email deliverability এবং spam placement",
      "Inbox warm-up",
      "Instantly-তে inbox connection",
      "Lead upload এবং campaign setup",
      "Sending schedule, daily limit এবং inbox rotation",
      "Cold email ও follow-up লেখা",
      "Campaign launch, monitoring এবং reply management",
    ],
  },
];

export const workflow = {
  label: "সম্পূর্ণ Workflow",
  heading: "একটি Offer থেকে একটি বাস্তব Opportunity পর্যন্ত",
  steps: [
    { label: "Offer" },
    { label: "ICP" },
    { label: "Lead List" },
    { label: "Verification" },
    { label: "Infrastructure" },
    { label: "Email Copy" },
    { label: "Campaign" },
    { label: "Replies" },
    { label: "Opportunity" },
  ] satisfies readonly WorkflowStep[],
} as const;

/*
 * Sanitized derivatives only. The five campaign/inbox-placement/sender-health
 * items below are the SAME already-audited evidence the agency site itself
 * uses (imported directly from `src/assets/results/`, not duplicated into
 * `public/masterclass/`) — see `@/components/public/campaign-evidence-data`
 * for the full audit trail (the 2026-09-02 evidence audit, the $25,000/
 * $17,000/$140,000 pixel redactions, and why each caption/number is worded
 * the way it is). Every caption/alt below is a Bengali translation of that
 * same file's English text, preserving the exact meaning and denominators —
 * never re-derived or re-worded independently.
 *
 * `client-feedback` (Upwork review screenshots) is intentionally left
 * unchanged — it's an Upwork/profile credibility asset, not campaign
 * evidence, and per this migration's instructions is audited separately
 * (see the migration report) rather than touched here.
 */
export const resultsProof = {
  label: "বাস্তব কাজের প্রমাণ",
  heading: "দাবি নয়—বাস্তব কাজের ফলাফল",
  /**
   * Discoverability hint on each of the 5 evidence cards below — they open
   * an in-page lightbox now, not a new tab, so this deliberately carries no
   * "opens in a new tab"/arrow implication (unlike `viewFullSizeLabel`).
   */
  enlargeHintLabel: "ক্লিক করে ছবিটি বড় করে দেখুন",
  /** Only `clientFeedback` below still uses this — it still opens the original file in a new tab, unchanged. */
  viewFullSizeLabel: "ছবিটি বড় করে দেখুন ↗",
  /** The 5 audited Outbound BD campaign/inbox-placement/sender-health items — rendered by `MasterclassEvidenceGallery` with click-to-enlarge. */
  assets: [
    {
      id: "instantly-2025-08-05",
      src: instantly20250805,
      alt: "Instantly ক্যাম্পেইন রিপোর্ট: মোট ৫.৬K ইমেইল পাঠানো হয়েছে, platform-reported ৮৩.৯% ওপেন রেট, ২.৭% রিপ্লাই রেট এবং ২৫টি সেলস অপারচুনিটি তৈরি হয়েছে",
      caption:
        "Instantly-তে একটি ধারাবাহিক ক্যাম্পেইনের ফলাফল — প্রায় তিন মাসে ৫.৬K ইমেইল পাঠানো হয়েছে, platform-reported ৮৩.৯% ওপেন রেট এবং ২.৭% রিপ্লাই রেট, যা থেকে ২৫টি সেলস অপারচুনিটি তৈরি হয়েছে।",
      note: "Platform-এর নির্ধারণ করা টাকার অঙ্ক দেখানো হয়নি, কারণ এটি independently verified আয় নয়।",
    },
    {
      id: "inbox-placement-test-result2",
      src: inboxPlacementTestResult2,
      alt: "Instantly ইনবক্স-প্লেসমেন্ট টেস্ট: ৩,৯৮০টি টেস্ট ইমেইলের মধ্যে ৩,৯৭৫টি রিসিভ হয়েছে, যার মধ্যে ৩,৯০৭টি (৯৮.২৯%) ইনবক্সে পৌঁছেছে, প্রোভাইডার-ভিত্তিক বিস্তারিত টেবিলসহ",
      caption:
        "Instantly-এর একটি ইনবক্স-প্লেসমেন্ট টেস্ট — ৩,৯৮০টি টেস্ট ইমেইল পাঠানো হয়েছিল, এর মধ্যে ৩,৯৭৫টি রিসিভ হয়, এবং রিসিভ হওয়া ইমেইলের মধ্যে ৩,৯০৭টি (৯৮.২৯%) এই নির্দিষ্ট টেস্টে ইনবক্সে পৌঁছেছে (৬৮টি বা ১.৭১% স্প্যামে গিয়েছিল) — সেন্ডার/রিসিপিয়েন্ট প্রোভাইডার অনুযায়ী বিভক্ত।",
      note: "এটি একটি নির্দিষ্ট টেস্টের ফলাফল — প্রতিটি ক্যাম্পেইন বা প্রোভাইডার সমন্বয়ের জন্য এটি guaranteed বা typical outcome নয়।",
    },
    {
      id: "instantly-result-98",
      src: instantlyResult98,
      alt: "Instantly ক্যাম্পেইন রিপোর্ট: ৭৫৯টি sequence start, platform-reported ৯৮% ওপেন রেট এবং ১৭টি সেলস অপারচুনিটি",
      caption:
        "Instantly-তে আরেকটি ছোট ক্যাম্পেইন — ৭৫৯টি sequence start থেকে platform-reported ৯৮% ওপেন রেট এবং ১৭টি সেলস অপারচুনিটি তৈরি হয়েছে।",
      note: "Platform-এর নির্ধারণ করা টাকার অঙ্ক দেখানো হয়নি, কারণ এটি independently verified আয় নয়।",
    },
    {
      id: "instantly-campaign-result-2",
      src: instantlyCampaignResult2,
      alt: "Instantly ক্যাম্পেইন রিপোর্ট: ১,২৭,১৪৯টি sequence start, ১৪০টি অপারচুনিটি এবং রিপ্লাইগুলোর মধ্যে ৭৮.৬৫% Positive Reply Rate",
      caption:
        "১,২৭,১৪৯টি sequence start থেকে ১৪০টি সেলস অপারচুনিটি তৈরি হয়েছে। Instantly রিপোর্ট করেছে রিপ্লাইগুলোর মধ্যে ৭৮.৬৫% Positive Reply Rate — এটি সামগ্রিক ক্যাম্পেইন রিপ্লাই রেট নয়।",
      note: "এটি একটি ব্যতিক্রমী (exceptional) ফলাফল, সাধারণ বা guaranteed outcome নয় — বেশিরভাগ ক্যাম্পেইনের ফলাফল এখানে দেখানো অন্য উদাহরণগুলোর কাছাকাছি হয়ে থাকে। Platform-এর নির্ধারণ করা টাকার অঙ্কও দেখানো হয়নি, কারণ এটি independently verified আয় নয়।",
    },
    {
      id: "campaign-result-smartlead",
      src: campaignResultSmartlead,
      alt: "Smartlead সেন্ডার ওয়ার্ম-আপ রিপোর্ট: ৪২টির মধ্যে ৪২টি ওয়ার্ম-আপ ইমেইল ইনবক্সে পৌঁছেছে, শূন্যটি স্প্যামে যায়নি",
      caption:
        "Smartlead-এ সেন্ডার ওয়ার্ম-আপ হেলথ — এই স্ন্যাপশটে ৪২টির মধ্যে ৪২টি ওয়ার্ম-আপ ইমেইল ইনবক্সে পৌঁছেছে, শূন্যটি স্প্যাম হিসেবে চিহ্নিত হয়েছে। প্রতিটি ম্যানেজড ইনবক্সে এই ধরনের চলমান ইনফ্রাস্ট্রাকচার মনিটরিং করা হয়।",
      note: "এটি একটি নির্দিষ্ট স্ন্যাপশট — কোনো guaranteed deliverability ফলাফল হিসেবে সাধারণীকরণ করা উচিত নয়।",
    },
  ] satisfies readonly ProofAsset[],
  /**
   * Upwork review screenshot — intentionally NOT part of `assets` above and
   * NOT wired into the click-to-enlarge gallery: per this migration's
   * instructions, `feedback-five-star.png` is an Upwork/profile credibility
   * asset (not campaign evidence) and must keep its existing "open the
   * original file in a new tab" behavior unchanged, rendered separately in
   * `ResultsProof.tsx`. Never edit/recompress/replace this file.
   */
  clientFeedback: {
    id: "client-feedback",
    src: "/masterclass/feedback-five-star.png",
    alt: "Upwork-এ cold email ও lead generation কাজের উপর তিনটি 5-star client feedback",
    caption: "Upwork-এ verified client-দের থেকে পাওয়া real feedback, হুবহু।",
  } as ProofAsset,
} as const;

export const instructor = {
  label: "আপনার ইনস্ট্রাক্টর",
  heading: "আব্দুল্লাহ আল মাসুম",
  role: "Cold Email Outreach ও B2B Lead Generation বিশেষজ্ঞ",
  portraitAlt: "আব্দুল্লাহ আল মাসুম-এর ছবি",
  paragraphs: [
    "আমার যাত্রা শুরু হয়েছিল সাধারণ data-entry কাজ দিয়ে। ধীরে ধীরে আমি B2B Lead Generation এবং Cold Email Outreach-এ specialize করি—এবং গত প্রায় ১১ বছর ধরে এটাই আমার মূল কাজ।",
    "এই সময়ে আমি Upwork, Fiverr এবং direct client engagement-এর মাধ্যমে বিভিন্ন দেশের international client-দের সঙ্গে কাজ করেছি—email infrastructure সেট আপ, deliverability ঠিক রাখা, prospect research এবং campaign management নিয়ে।",
    "এটি আমার প্রথম public live মাস্টারক্লাস। আমি যা কাজে ব্যবহার করি, ঠিক সেই workflow-টাই এখানে শেখাচ্ছি—কোনো তত্ত্বনির্ভর কোর্স নয়।",
  ],
  proof: {
    src: "/masterclass/upwork-profile-proof.png",
    width: 1322,
    height: 898,
    alt: "আব্দুল্লাহ আল মাসুমের Upwork প্রোফাইল—Top Rated, $100K+ lifetime earnings, ২৪৪টি কাজ, ২২,৩০২ ঘণ্টা",
    caption:
      "Upwork প্রোফাইলের public পরিসংখ্যান। $100K+ figure-টি Upwork platform-এর lifetime earnings, ব্যক্তিগত income বা profit নয়।",
  },
  /* Verifiable public profile — kept as data so the component never hardcodes a URL. */
  profileLinks: [
    {
      label: "Upwork প্রোফাইল যাচাই করুন ↗",
      /* Matches UPWORK_PROFILE_URL in @/components/public/site-config — kept as a literal here since this data file must not import a client-facing agency component module, but the URL itself must stay identical. */
      href: "https://www.upwork.com/freelancers/~01a5eccfaf40a8a065?viewMode=1",
    },
  ] satisfies readonly ProfileLink[],
} as const;

export const audienceFit = {
  join: {
    label: "যাদের জন্য এই মাস্টারক্লাস",
    heading: "যারা যোগ দেবেন",
    items: [
      "যারা একদম শুরু থেকে B2B Lead Generation ও Cold Email Outreach শিখতে চান",
      "বিদ্যমান freelancer যারা একটি নতুন, চাহিদাসম্পন্ন service যোগ করতে চান",
      "যারা সরাসরি client outreach-এর প্রক্রিয়া বুঝতে চান—শুধু marketplace-নির্ভর না থেকে",
      "যারা চর্চা করার জন্য সময় ও ধৈর্য রাখতে প্রস্তুত",
    ],
  },
  skip: {
    label: "যাদের জন্য এটি নয়",
    heading: "যারা যোগ না দিলেই ভালো",
    items: [
      "যারা guaranteed income বা guaranteed client খুঁজছেন",
      "যারা মনে করেন দুই দিনেই সব শেখা শেষ হয়ে যাবে, চর্চা লাগবে না",
      "যারা “রাতারাতি ধনী হওয়ার” কোনো shortcut খুঁজছেন",
      "যারা এখনই বেসিক কম্পিউটার ও internet ব্যবহারে স্বচ্ছন্দ নন",
    ],
  },
} as const;

export const registration = {
  label: "রেজিস্ট্রেশন",
  heading: "আপনার সিট নিশ্চিত করুন",
  description:
    "নাম, ইমেইল ও মোবাইল নম্বর দিয়ে রেজিস্ট্রেশন করুন, এরপর bKash/Nagad/Rocket-এর যেকোনো একটি দিয়ে পেমেন্ট সম্পন্ন করুন।",
  priceLabel: "কোর্স ফি",
  /* No embedded price string — Registration.tsx renders formatBDT(priceBDT), with a small "নিয়মিত মূল্য" note when the current price is the current batch's (discounted) one. */
  earlyBirdLabel: "প্রথম ব্যাচের মূল্য",
  regularPricePrefix: "নিয়মিত মূল্য",
  dateLabel: "ক্লাসের তারিখ",
  dateValue: `${classDatesLabelBn}, প্রতিদিন রাত ৯টা`,
  paymentNote:
    "রেজিস্ট্রেশনের পর bKash, Nagad বা Rocket-এ ম্যানুয়ালি পেমেন্ট পাঠিয়ে Transaction ID জমা দিন। আমরা যাচাই করার পর ইমেইলে কনফার্মেশন পাঠাবো।",
  fields: {
    name: "পুরো নাম",
    namePlaceholder: "আপনার নাম লিখুন",
    email: "ইমেইল",
    emailPlaceholder: "you@example.com",
    phone: "মোবাইল নম্বর",
    phonePlaceholder: "01XXXXXXXXX",
  },
  /* The three policy links are interpolated into this sentence by the form from legalPageLinks — kept as fixed sentence glue here, not duplicated content. */
  consentPrefix: "আমি",
  consentJoiner: "ও",
  consentSuffix: "মেনে নিচ্ছি।",
  marketingConsentLabel:
    "ভবিষ্যৎ অফার ও আপডেট সম্পর্কে ইমেইল পেতে চাই (ঐচ্ছিক)।",
  submitEnabledLabel: "এখনই ভর্তি হোন",
  submitDisabledLabel: "পেমেন্ট সেটআপ চলছে",
  /* Shown only while checkoutEnabled is false. */
  devNotice:
    "Development note: রেজিস্ট্রেশন সিস্টেম এখনও সম্পূর্ণভাবে সংযুক্ত হয়নি। এই ফর্মটি বর্তমানে শুধু preview হিসেবে দেখানো হচ্ছে; জমা দেওয়া সম্ভব নয়।",
} as const;

/**
 * The enrollment-section promotional callout. Only rendered while the
 * current batch's price is the discounted one (`isEarlyBird`, see
 * `Registration.tsx`) — deliberately not shown once a future batch's price
 * is manually raised to `regularPriceBDT`, since the "first batch" framing
 * would no longer be true. The two price lines are built by the component
 * from `formatBDT()`, never re-typed here as literal ৳ amounts, so this
 * copy never drifts from `src/lib/masterclass/constants.ts`.
 */
export const registrationBatchNotice = {
  emoji: "🎟️",
  heading: "প্রথম ব্যাচ, প্রথম সুযোগ",
  intro: "এটি আমার প্রথম মাস্টার ক্লাস, তাই প্রথম ব্যাচের জন্য বিশেষ মূল্য রাখছি।",
  regularPriceLabel: "নিয়মিত মূল্য:",
  firstBatchPriceLabel: "প্রথম ব্যাচের জন্য: মাত্র",
  closing:
    "এই প্রথম ব্যাচেই সবচেয়ে কম মূল্যে যুক্ত হওয়ার সুযোগ। পরবর্তী ব্যাচ থেকে ফি বাড়বে।",
} as const;

/** Bengali labels/instructions per manual channel — numbers/bank details themselves come from env (`getManualPaymentEnv()`), never hardcoded here. */
export const paymentMethods: Record<"BKASH" | "NAGAD" | "ROCKET" | "BANK", ManualPaymentMethodCopy> = {
  BKASH: {
    label: "bKash",
    instructions: "Send Money অপশন ব্যবহার করে নিচের নম্বরে টাকা পাঠান।",
  },
  NAGAD: {
    label: "Nagad",
    instructions: "Send Money অপশন ব্যবহার করে নিচের নম্বরে টাকা পাঠান।",
  },
  ROCKET: {
    label: "Rocket",
    instructions: "Send Money অপশন ব্যবহার করে নিচের নম্বরে টাকা পাঠান।",
  },
  BANK: {
    label: "Bank Transfer",
    instructions: "নিচের ব্যাংক অ্যাকাউন্টে টাকা পাঠিয়ে প্রেরকের নাম ও Transaction/Reference ID জমা দিন।",
  },
} as const;

/*
 * Only rendered by MasterclassRegistrationForm.tsx, which itself only
 * mounts when `formEnabled` is true — see Registration.tsx.
 */
export const registrationForm = {
  loadingLabel: "জমা হচ্ছে...",
  errorSummaryHeading: "ফর্মে কিছু তথ্য ঠিক নেই",
  nameError: "অনুগ্রহ করে আপনার পুরো নাম লিখুন (কমপক্ষে ২ অক্ষর)।",
  emailError: "অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা লিখুন।",
  phoneError: "অনুগ্রহ করে সঠিক বাংলাদেশি মোবাইল নম্বর লিখুন (যেমন 01XXXXXXXXX)।",
  consentError: "রেজিস্ট্রেশন সম্পন্ন করতে শর্তাবলী মেনে নেওয়া আবশ্যক।",
  turnstileMissingError: "অনুগ্রহ করে যাচাইকরণ সম্পন্ন করুন।",
  turnstileExpiredError: "যাচাইকরণের মেয়াদ শেষ হয়ে গেছে। অনুগ্রহ করে আবার যাচাই করুন।",
  turnstileWidgetError: "যাচাইকরণ লোড করা যায়নি। অনুগ্রহ করে পেজ রিফ্রেশ করে আবার চেষ্টা করুন।",
  genericError:
    "দুঃখিত, অনুরোধটি সম্পন্ন করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন, অথবা hello@outboundbd.com-এ যোগাযোগ করুন।",
  /* REGISTRATION_CONFLICT — the submitted email is already registered under a different phone number. Rotating the idempotency key would not fix this, so the message asks for a data correction or direct contact instead of "try again." */
  registrationConflictError:
    "এই ইমেইল দিয়ে ভিন্ন তথ্যসহ ইতিমধ্যে একটি রেজিস্ট্রেশন আছে। অনুগ্রহ করে আপনার ইমেইল ও মোবাইল নম্বর যাচাই করুন, অথবা hello@outboundbd.com-এ যোগাযোগ করুন।",
  /* IDEMPOTENCY_CONFLICT — the previous idempotency key is now invalid; the next submit must use a fresh one, so this explicitly invites a retry. */
  idempotencyConflictError:
    "একটি সাময়িক সমস্যা হয়েছে। অনুগ্রহ করে আবার \"এখনই ভর্তি হোন\" বাটনে চাপ দিন।",
  unavailableError: "সিস্টেমটি সাময়িকভাবে অনুপলব্ধ। অনুগ্রহ করে একটু পর আবার চেষ্টা করুন।",
  networkError: "নেটওয়ার্ক সমস্যার কারণে অনুরোধ পাঠানো যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।",
  rateLimitedPrefix: "অনুরোধের সীমা অতিক্রম হয়েছে। অনুগ্রহ করে",
  rateLimitedSuffix: "সেকেন্ড পর আবার চেষ্টা করুন।",

  /* Step 2 — choosing a method + entering payment evidence. */
  paymentStepHeading: "পেমেন্ট মাধ্যম বেছে নিন",
  paymentStepDescription: "নিচের যেকোনো একটি মাধ্যমে টাকা পাঠিয়ে Sender Number ও Transaction ID জমা দিন।",
  amountLabel: "পাঠাতে হবে",
  accountNumberLabel: "নম্বর",
  copyLabel: "কপি করুন",
  copiedLabel: "কপি হয়েছে",
  senderNumberLabel: "যে নম্বর থেকে পাঠিয়েছেন",
  senderNumberPlaceholder: "01XXXXXXXXX",
  senderNumberError: "অনুগ্রহ করে সঠিক বাংলাদেশি মোবাইল নম্বর লিখুন।",
  transactionIdLabel: "Transaction ID",
  transactionIdPlaceholder: "যেমন 9G7H2K1XYZ",
  transactionIdError: "Transaction ID সঠিকভাবে লিখুন (কমপক্ষে ৪ অক্ষর)।",
  paymentMethodError: "অনুগ্রহ করে একটি পেমেন্ট মাধ্যম বেছে নিন।",
  /* Bank-transfer step 2 — destination details (server-controlled, from getManualPaymentEnv().bank) and the two fields the student submits. */
  bankNameLabel: "ব্যাংক",
  bankAccountNameLabel: "অ্যাকাউন্টের নাম",
  bankAccountNumberLabel: "অ্যাকাউন্ট নম্বর",
  bankBranchLabel: "শাখা",
  bankRoutingNumberLabel: "রাউটিং নম্বর",
  payerNameLabel: "প্রেরকের নাম (যে নামে অ্যাকাউন্ট আছে)",
  payerNamePlaceholder: "আপনার নাম লিখুন",
  payerNameError: "অনুগ্রহ করে প্রেরকের নাম লিখুন (কমপক্ষে ২ অক্ষর)।",
  senderBankNameLabel: "আপনার ব্যাংকের নাম (ঐচ্ছিক)",
  senderBankNamePlaceholder: "যেমন Dutch-Bangla Bank",
  transactionIdBankLabel: "Transaction/Reference ID",
  submitPaymentLabel: "পেমেন্ট তথ্য জমা দিন",
  changeMethodLabel: "মাধ্যম পরিবর্তন করুন",
  /* DUPLICATE_TRANSACTION_ID — this exact TxID is already recorded against another order. */
  duplicateTransactionError:
    "এই Transaction ID ইতিমধ্যে অন্য একটি রেজিস্ট্রেশনে ব্যবহৃত হয়েছে। অনুগ্রহ করে আইডিটি আবার যাচাই করুন, অথবা hello@outboundbd.com-এ যোগাযোগ করুন।",
  orderNotEditableError:
    "এই রেজিস্ট্রেশনের পেমেন্ট ইতিমধ্যে প্রক্রিয়া করা হয়েছে। প্রশ্ন থাকলে hello@outboundbd.com-এ যোগাযোগ করুন।",

  /* Step 3 — pending verification. Deliberately never says "registration confirmed." */
  pendingHeading: "পেমেন্ট তথ্য জমা হয়েছে",
  pendingBody:
    "আপনার পেমেন্ট এখন যাচাই করা হচ্ছে। যাচাই সম্পন্ন হওয়ার পর আপনার রেজিস্ট্রেশন কনফার্মেশন ইমেইলে পাঠানো হবে। লাইভ ক্লাসের লিংক ক্লাস শুরুর আগে আলাদাভাবে পাঠানো হবে।",
  pendingRegistrationRefLabel: "রেজিস্ট্রেশন আইডি",
} as const;

export const faqItems: readonly FaqItem[] = [
  {
    id: "beginners",
    question: "এই মাস্টারক্লাস কি একদম নতুনদের জন্য?",
    answer:
      "হ্যাঁ। কোনো আগের অভিজ্ঞতা ছাড়াই শুরু করা যায়—তবে বেসিক কম্পিউটার ও internet ব্যবহারে স্বচ্ছন্দ থাকা দরকার।",
  },
  {
    id: "two-days-enough",
    question: "দুই দিনে কি পুরো বিষয় শেখা সম্ভব?",
    answer:
      "দুই দিনে আপনি একটি সঠিক foundation, সম্পূর্ণ workflow এবং একটি বাস্তব roadmap পাবেন। কিন্তু deliverability, prospect research ও campaign optimization-এ দক্ষ হতে চর্চা প্রয়োজন—এটি কোনো এক-লাফে শেষ হওয়ার বিষয় নয়।",
  },
  {
    id: "live",
    question: "ক্লাস কি লাইভ হবে?",
    answer: "হ্যাঁ, দুই দিনই সম্পূর্ণ লাইভ অনলাইন ক্লাস, সঙ্গে লাইভ প্রশ্নোত্তর পর্ব।",
  },
  {
    id: "recording",
    question: "ক্লাসের recording দেওয়া হবে কি?",
    answer:
      "হ্যাঁ। লাইভ ক্লাস শেষ হওয়ার পর নিবন্ধিত শিক্ষার্থীরা ৭ দিন রেকর্ডিং দেখতে পারবেন। রেকর্ডিং দেখার নির্দেশনা নিবন্ধনের সময় দেওয়া ইমেইলে পাঠানো হবে।",
  },
  {
    id: "paid-tools",
    question: "অংশ নিতে কি paid tools প্রয়োজন?",
    answer:
      "ক্লাসে অংশ নিতে কোনো paid tool বাধ্যতামূলক নয়। ক্লাসে ব্যবহৃত কিছু tool-এর (যেমন Instantly) নিজস্ব pricing আছে, যা পরবর্তীতে বাস্তব কাজে ব্যবহার করতে চাইলে প্রয়োজন হতে পারে।",
  },
  {
    id: "income-guarantee",
    question: "এই মাস্টারক্লাস করলে কি income নিশ্চিত?",
    answer:
      "না। এখানে কোনো income বা client পাওয়ার guarantee দেওয়া হয় না। আপনি একটি সঠিক foundation ও সম্পূর্ণ workflow শিখবেন—ফলাফল নির্ভর করবে আপনার চর্চা ও প্রয়োগের উপর।",
  },
  {
    id: "confirmation",
    question: "Payment করার পর confirmation কীভাবে পাব?",
    answer:
      "পেমেন্ট সফলভাবে যাচাই হওয়ার পর আপনার দেওয়া ইমেইলে রেজিস্ট্রেশন কনফার্মেশন পাঠানো হবে। ক্লাসে যোগ দেওয়ার লিংক ও প্রয়োজনীয় নির্দেশনা ক্লাস শুরুর আগে আলাদা ইমেইলে পাঠানো হবে।",
  },
  {
    id: "questions",
    question: "ক্লাসে প্রশ্ন করার সুযোগ থাকবে কি?",
    answer: "হ্যাঁ, প্রতিদিনের ক্লাসের শেষে একটি লাইভ প্রশ্নোত্তর পর্ব থাকবে।",
  },
  {
    id: "live-link-delivery",
    question: "লাইভ ক্লাসের লিংক কীভাবে পাবো?",
    answer:
      "পেমেন্ট যাচাই সম্পন্ন হওয়ার পর আপনি একটি কনফার্মেশন ইমেইল পাবেন। লাইভ ক্লাসে যোগ দেওয়ার লিংক ক্লাস শুরুর আগে আলাদা ইমেইলে পাঠানো হবে—তাই রেজিস্ট্রেশনের সময় সঠিক ইমেইল ঠিকানা দেওয়া নিশ্চিত করুন।",
  },
  {
    id: "mobile-join",
    question: "মোবাইল দিয়ে কি ক্লাসে যোগ দেওয়া যাবে?",
    answer: "হ্যাঁ। Zoom app ইনস্টল করা যেকোনো স্মার্টফোন থেকেই লাইভ ক্লাসে যোগ দেওয়া যাবে।",
  },
];

export const finalCta = {
  heading: "সঠিক foundation দিয়ে শুরু করুন",
  description:
    "কোনো shortcut নয়—একটি বাস্তব workflow শিখুন, যা দিয়ে আপনি নিজে চর্চা করে এগিয়ে যেতে পারবেন।",
  /* No embedded price — FinalCta.tsx appends formatBDT(priceBDT). */
  ctaLabel: "এখনই ভর্তি হোন",
} as const;

export const footer = {
  positioning: "Abdullah Al Masum — Cold Email Outreach ও B2B Lead Generation বিশেষজ্ঞ।",
  copyright: "© ২০২৬ Outbound BD। সর্বস্বত্ব সংরক্ষিত।",
  backToPortfolio: "Outbound BD-এর মূল ওয়েবসাইটে ফিরে যান",
} as const;

/* No embedded price — StickyMobileCta.tsx appends formatBDT(priceBDT). */
export const stickyCta = {
  label: "ভর্তি হোন",
} as const;
