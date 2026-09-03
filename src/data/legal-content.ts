import { classDates } from "@/lib/masterclass/constants";
import { formatClassDatesBn } from "@/lib/masterclass/format";
import type { LegalPageContent, LegalPageLink } from "@/types/legal";

/** Derived once from `classDates` — see `formatClassDatesBn()`'s doc comment for why this is never a re-typed literal. */
const classDatesLabelBn = formatClassDatesBn(classDates.day1, classDates.day2);

/*
 * Operational draft, not a substitute for professional legal review. Written
 * to accurately describe how the masterclass funnel actually works today
 * (Phase 3A: no payment gateway, no email sender, no analytics tracking is
 * wired up yet) — see CLAUDE.md for what still needs review before each of
 * those goes live.
 */

export const legalMeta = {
  /* Bumped alongside policyVersions.terms in constants.ts — the Terms' course-details date was corrected today. */
  lastUpdatedLabel: "সর্বশেষ হালনাগাদ: ৩ সেপ্টেম্বর ২০২৬",
  updateNotice:
    "পেমেন্ট প্রোভাইডার, analytics বা অন্য কোনো service provider পরিবর্তন হলে এই নীতিমালাগুলো আপডেট করা হতে পারে। উল্লেখযোগ্য পরিবর্তন হলে নতুন হালনাগাদ তারিখসহ এই পাতাতেই তা প্রকাশ করা হবে।",
  disclaimer:
    "এই নীতিমালাগুলো Outbound BD-এর সার্ভিস কীভাবে পরিচালিত হয় তা সহজ ভাষায় ব্যাখ্যা করার জন্য তৈরি। এটি কোনো আইনি পরামর্শ নয়, এবং আমরা দাবি করি না যে এটি প্রতিটি দেশের প্রতিটি প্রযোজ্য আইনের সাথে সম্পূর্ণভাবে সামঞ্জস্যপূর্ণ।",
} as const;

/*
 * Namespaced under the masterclass route (NOT the top-level slugs the source
 * used) because Outbound BD's agency site already owns `/privacy-policy` for
 * its own, unrelated inquiry-form privacy policy. These pages describe only
 * the masterclass registration/payment flow, so they live under the
 * masterclass route instead of colliding with — or being confused with —
 * the agency-wide policy.
 */
const LEGAL_BASE_PATH = "/masterclass/lead-generation-cold-email/legal";

export const legalPageLinks: readonly LegalPageLink[] = [
  { slug: "privacy-policy", label: "Privacy Policy", href: `${LEGAL_BASE_PATH}/privacy-policy` },
  {
    slug: "terms-and-conditions",
    label: "Terms and Conditions",
    href: `${LEGAL_BASE_PATH}/terms-and-conditions`,
  },
  { slug: "refund-policy", label: "Refund Policy", href: `${LEGAL_BASE_PATH}/refund-policy` },
];

export const privacyPolicy: LegalPageContent = {
  slug: "privacy-policy",
  seoTitle: "Privacy Policy | Outbound BD মাস্টারক্লাস",
  metaDescription:
    "Outbound BD মাস্টারক্লাসের জন্য কী তথ্য সংগ্রহ করা হয়, কেন এবং কীভাবে সুরক্ষিত রাখা হয়—তার সহজ ব্যাখ্যা।",
  eyebrow: "নীতিমালা",
  heading: "Privacy Policy",
  intro: [
    "এই Privacy Policy ব্যাখ্যা করে Outbound BD (পরিচালক: আব্দুল্লাহ আল মাসুম, ওয়েবসাইট: outboundbd.com) কীভাবে 2-Day Lead Generation ও Cold Email Outreach মাস্টারক্লাসে রেজিস্ট্রেশনের সময় আপনার তথ্য সংগ্রহ, ব্যবহার এবং সংরক্ষণ করে।",
  ],
  sections: [
    {
      id: "who-we-are",
      heading: "১. কে এই সার্ভিস পরিচালনা করে",
      paragraphs: [
        "এই মাস্টারক্লাস ও ওয়েবসাইট outboundbd.com পরিচালনা করেন আব্দুল্লাহ আল মাসুম, একজন স্বাধীন freelancer, বাংলাদেশ থেকে। যেকোনো প্রশ্নের জন্য hello@outboundbd.com-এ যোগাযোগ করা যাবে।",
      ],
    },
    {
      id: "data-collected",
      heading: "২. কী তথ্য সংগ্রহ করা হয়",
      paragraphs: ["মাস্টারক্লাসে রেজিস্ট্রেশন করলে নিচের তথ্যগুলো সংগ্রহ করা হয়:"],
      items: [
        "আপনার নাম",
        "ইমেইল ঠিকানা",
        "বাংলাদেশি মোবাইল নম্বর",
        "আপনি Terms and Conditions, Privacy Policy ও Refund Policy মেনে নিয়েছেন—এই সম্মতির প্রমাণ (কখন এবং কোন ভার্সন মেনে নিয়েছেন)",
        "ঐচ্ছিক marketing consent—ভবিষ্যৎ ইমেইল আপডেট পেতে চান কিনা",
        "রেজিস্ট্রেশন ও পেমেন্ট-অর্ডারের status (যেমন: পেমেন্ট pending, review-এ আছে, verified/সফল, বা প্রত্যাখ্যাত)",
        "বর্তমানে পেমেন্ট ম্যানুয়ালি bKash, Nagad বা Rocket-এর মাধ্যমে যাচাই করা হয়—তাই আপনার বেছে নেওয়া পেমেন্ট মাধ্যম, আপনি যে নম্বর থেকে টাকা পাঠিয়েছেন এবং Transaction ID সংগ্রহ করা হয়। আমরা কখনোই আপনার PIN, OTP বা সম্পূর্ণ card তথ্য সংগ্রহ করি না—দেখুন নিচের ৩ নম্বর অংশ",
        "আপনি কীভাবে এই পেজে এসেছেন তার UTM, referrer ও Meta বিজ্ঞাপন সংক্রান্ত পরিচয়সূচক তথ্য (fbclid, _fbp, _fbc)",
        "সীমিত পরিসরে IP address ও browser/user-agent তথ্য, নিরাপত্তা ও fraud প্রতিরোধের জন্য",
      ],
    },
    {
      id: "never-collected",
      heading: "৩. যা কখনোই সংগ্রহ বা সংরক্ষণ করা হয় না",
      paragraphs: [
        "Outbound BD কখনোই আপনার card-এর PIN, bKash বা Nagad-এর PIN, OTP, অথবা সম্পূর্ণ card নম্বর/CVV সংগ্রহ বা সংরক্ষণ করে না। Payment gateway সংযুক্ত হওয়ার পর সমস্ত সংবেদনশীল পেমেন্ট তথ্য সরাসরি payment provider-এর নিজস্ব নিরাপদ payment page-এ প্রক্রিয়া হবে—আমাদের সার্ভারে নয়।",
      ],
    },
    {
      id: "purposes",
      heading: "৪. কেন এই তথ্য ব্যবহার করা হয়",
      paragraphs: ["সংগৃহীত তথ্য নিচের উদ্দেশ্যে ব্যবহার করা হয়:"],
      items: [
        "রেজিস্ট্রেশন প্রক্রিয়া সম্পন্ন করা",
        "পেমেন্ট যাচাই করা",
        "ক্লাস-সংক্রান্ত যোগাযোগ ও ক্লাসে প্রবেশাধিকার দেওয়া",
        "সাপোর্ট ও প্রশ্নের উত্তর দেওয়া",
        "Duplicate registration বা fraud প্রতিরোধ করা",
        "হিসাব-নিকাশ (accounting) সংরক্ষণ",
        "শুধুমাত্র যারা আলাদাভাবে marketing consent দিয়েছেন, তাদের ভবিষ্যৎ আপডেট পাঠানো",
      ],
    },
    {
      id: "sharing",
      heading: "৫. তথ্য কার সঙ্গে শেয়ার করা হয়",
      paragraphs: [
        "প্রয়োজনীয় ক্ষেত্রে সীমিত পরিমাণে তথ্য নিচের ধরনের service provider-দের সঙ্গে শেয়ার করা হতে পারে—প্রতিটি provider শুধু তাদের কাজের জন্য প্রয়োজনীয় তথ্যটুকুই পায়:",
      ],
      items: [
        "Hosting ও database provider (যেমন MongoDB Atlas)",
        "ইমেইল পাঠানোর জন্য ব্যবহৃত email-delivery provider (Resend)",
        "Meta (Facebook/Instagram)—শুধুমাত্র বিজ্ঞাপনের কার্যকারিতা পরিমাপের জন্য, hashed ইমেইল/ফোন ও attribution তথ্য সহ। বিস্তারিত ১২ নম্বর অংশে",
        "Cloudflare—bot প্রতিরোধ (Turnstile) সেবার জন্য",
        "Zoom বা ক্লাস পরিচালনার জন্য ব্যবহৃত platform",
        "ভবিষ্যতে একটি payment gateway সংযুক্ত হলে, সেই provider",
        "আইনগতভাবে বাধ্যতামূলক হলে সংশ্লিষ্ট কর্তৃপক্ষ",
      ],
    },
    {
      id: "cross-border",
      heading: "৬. আন্তর্জাতিক তথ্য প্রক্রিয়াকরণ",
      paragraphs: [
        "এখানে উল্লেখিত hosting, database বা অন্যান্য infrastructure provider বাংলাদেশের বাইরে সার্ভার পরিচালনা করতে পারে। ফলে আপনার তথ্য বাংলাদেশের বাইরেও প্রক্রিয়া বা সংরক্ষিত হতে পারে।",
      ],
    },
    {
      id: "security",
      heading: "৭. নিরাপত্তা",
      paragraphs: [
        "আপনার তথ্য সুরক্ষিত রাখতে যুক্তিসঙ্গত প্রযুক্তিগত ব্যবস্থা নেওয়া হয়। তবে ইন্টারনেটে কোনো সিস্টেমই সম্পূর্ণভাবে নিরাপদ—এমন দাবি আমরা করি না।",
      ],
    },
    {
      id: "retention",
      heading: "৮. তথ্য সংরক্ষণের মেয়াদ",
      paragraphs: [
        "রেজিস্ট্রেশন, পেমেন্ট রেকর্ড, হিসাব-নিকাশ, সাপোর্ট এবং fraud/dispute প্রতিরোধ ও আইনগত বাধ্যবাধকতার জন্য যতদিন যৌক্তিকভাবে প্রয়োজন ততদিন পর্যন্ত তথ্য সংরক্ষণ করা হয়। যখন আর যৌক্তিকভাবে প্রয়োজন থাকে না, তখন সময়ে সময়ে তথ্য মুছে ফেলা বা anonymize করা হয়। বর্তমানে কোনো নির্দিষ্ট automated deletion schedule চালু নেই—এই বিষয়টি স্পষ্ট রাখা হলো যাতে ভুল প্রত্যাশা তৈরি না হয়।",
      ],
    },
    {
      id: "your-rights",
      heading: "৯. আপনার অধিকার",
      paragraphs: ["আপনি অনুরোধ করতে পারেন:"],
      items: [
        "আপনার তথ্যে প্রবেশাধিকার (access)",
        "ভুল তথ্য সংশোধন (correction)",
        "যেখানে আইনগত ও কার্যকরভাবে সম্ভব, তথ্য মুছে ফেলা (deletion)",
        "ঐচ্ছিক marketing consent যেকোনো সময় প্রত্যাহার করা",
      ],
    },
    {
      id: "rights-contact",
      heading: "১০. প্রয়োজনীয় প্রক্রিয়াকরণ বনাম ঐচ্ছিক Marketing",
      paragraphs: [
        "উপরের অধিকারগুলো ব্যবহার করতে hello@outboundbd.com-এ যোগাযোগ করুন। রেজিস্ট্রেশন ও পেমেন্ট সম্পন্ন করার জন্য প্রয়োজনীয় তথ্য প্রক্রিয়াকরণ ঐচ্ছিক marketing consent থেকে সম্পূর্ণ আলাদা—marketing consent প্রত্যাহার করলেও আপনার রেজিস্ট্রেশন রেকর্ড প্রভাবিত হয় না।",
      ],
    },
    {
      id: "age",
      heading: "১১. বয়সসীমা",
      paragraphs: [
        "মাস্টারক্লাসে অংশ নিতে হলে আপনার বয়স কমপক্ষে ১৮ বছর হতে হবে, অথবা ১৮ বছরের কম বয়সীদের ক্ষেত্রে একজন অভিভাবক বা আইনগত guardian-এর মাধ্যমে রেজিস্ট্রেশন ও পেমেন্ট সম্পন্ন করতে হবে।",
      ],
    },
    {
      id: "analytics-future",
      heading: "১২. Bot প্রতিরোধ, analytics ও advertising tracking",
      paragraphs: [
        "স্প্যাম ও bot রেজিস্ট্রেশন প্রতিরোধে এই ওয়েবসাইট Cloudflare Turnstile ব্যবহার করে, যা রেজিস্ট্রেশন ফর্ম পূরণের সময় সক্রিয় হয়। এটি কোনো personal profiling করে না।",
        "এই ওয়েবসাইট Meta Pixel এবং Meta Conversions API (CAPI) ব্যবহার করে, যাতে Facebook ও Instagram-এ বিজ্ঞাপনের কার্যকারিতা বোঝা যায়। এর মাধ্যমে page view, রেজিস্ট্রেশন প্রক্রিয়া শুরু হওয়া এবং (payment যাচাই সম্পন্ন হওয়ার পর) সফল রেজিস্ট্রেশনের মতো ঘটনা Meta-কে পাঠানো হয়। এই তথ্যের মধ্যে থাকতে পারে: আপনি কোন বিজ্ঞাপন থেকে এসেছেন তার সংক্রান্ত পরিচয়সূচক তথ্য (যেমন fbclid, _fbp, _fbc), এবং—শুধুমাত্র payment যাচাইয়ের পর—hashed (এনক্রিপ্ট করা, plain text নয়) ইমেইল ও ফোন নম্বর, যা Meta-র নিজস্ব নিয়ম অনুযায়ী কখনোই plain text আকারে পাঠানো হয় না।",
        "Purchase (সফল পেমেন্ট) সংক্রান্ত তথ্য Meta-কে শুধুমাত্র server-side (Conversions API-এর মাধ্যমে) পাঠানো হয়, এবং তা কেবল তখনই যখন আপনার পেমেন্ট ম্যানুয়ালি যাচাই করে PAID হিসেবে নিশ্চিত করা হয়েছে—Transaction ID জমা দেওয়ার সময় নয়।",
      ],
    },
    {
      id: "updates-privacy",
      heading: "১৩. পরিবর্তন ও যোগাযোগ",
      paragraphs: [legalMeta.updateNotice, `প্রশ্ন থাকলে যোগাযোগ করুন: hello@outboundbd.com`],
    },
  ],
};

export const termsAndConditions: LegalPageContent = {
  slug: "terms-and-conditions",
  seoTitle: "Terms and Conditions | Outbound BD মাস্টারক্লাস",
  metaDescription:
    "Outbound BD-এর 2-Day Lead Generation ও Cold Email Outreach মাস্টারক্লাসে রেজিস্ট্রেশন ও অংশগ্রহণের শর্তাবলী।",
  eyebrow: "নীতিমালা",
  heading: "Terms and Conditions",
  intro: [
    "এই Terms and Conditions Outbound BD-এর 2-Day Lead Generation ও Cold Email Outreach মাস্টারক্লাসে রেজিস্ট্রেশন করার আগে পড়ে নিন। রেজিস্ট্রেশন সম্পন্ন করলে আপনি এই শর্তাবলীতে সম্মত হচ্ছেন বলে ধরে নেওয়া হবে।",
  ],
  sections: [
    {
      id: "identity-eligibility",
      heading: "১. সার্ভিসের পরিচিতি ও যোগ্যতা",
      paragraphs: [
        "এই মাস্টারক্লাস পরিচালনা করেন আব্দুল্লাহ আল মাসুম (Outbound BD), বাংলাদেশ থেকে। অংশ নিতে হলে আপনার বয়স কমপক্ষে ১৮ বছর হতে হবে, অথবা অভিভাবক/guardian-এর মাধ্যমে রেজিস্ট্রেশন সম্পন্ন করতে হবে।",
      ],
    },
    {
      id: "educational-purpose",
      heading: "২. শুধুমাত্র শিক্ষামূলক উদ্দেশ্য",
      paragraphs: [
        "এই মাস্টারক্লাস সম্পূর্ণভাবে শিক্ষামূলক। এখানে নিচের কোনো কিছুর প্রতিশ্রুতি বা guarantee দেওয়া হয় না:",
      ],
      items: [
        "নির্দিষ্ট income",
        "freelancing job পাওয়া",
        "client অর্জন",
        "Upwork বা Fiverr-এ সাফল্য",
        "নির্দিষ্ট cold email campaign ফলাফল",
      ],
    },
    {
      id: "results-depend",
      heading: "৩. ফলাফল অনেক কিছুর উপর নির্ভরশীল",
      paragraphs: [
        "বাস্তব ফলাফল নির্ভর করে আপনার দক্ষতা, চর্চা, ধারাবাহিকতা, বাজারের পরিস্থিতি এবং Upwork/Fiverr বা email service provider-দের নিজস্ব নিয়মাবলীর উপর—এর কোনোটির উপরই Outbound BD-এর সরাসরি নিয়ন্ত্রণ নেই।",
      ],
    },
    {
      id: "course-details",
      heading: "৪. কোর্সের বিবরণ",
      paragraphs: [
        `ফি: ৳২,০০০। লাইভ ক্লাস তারিখ: ${classDatesLabelBn}, Zoom-এর মাধ্যমে লাইভ। রেজিস্ট্রেশনকৃত শিক্ষার্থীরা লাইভ ক্লাস শেষ হওয়ার পর ৭ দিন recording-এর মাধ্যমে ক্লাসগুলো দেখতে পারবেন।`,
      ],
    },
    {
      id: "registration-confirmed",
      heading: "৫. রেজিস্ট্রেশন কখন নিশ্চিত হয়",
      paragraphs: [
        "শুধুমাত্র payment সফলভাবে যাচাই হওয়ার পরই রেজিস্ট্রেশন নিশ্চিত বলে গণ্য হবে। Payment pending বা failed অবস্থায় থাকা রেজিস্ট্রেশন নিশ্চিত নয়।",
      ],
    },
    {
      id: "accurate-info",
      heading: "৬. সঠিক তথ্য প্রদান",
      paragraphs: [
        "রেজিস্ট্রেশনের সময় আপনাকে সঠিক নাম, ইমেইল ও মোবাইল নম্বর দিতে হবে। ভুল তথ্যের কারণে confirmation বা ক্লাসে প্রবেশাধিকার পেতে সমস্যা হলে তার দায় Outbound BD-এর নয়।",
      ],
    },
    {
      id: "one-seat",
      heading: "৭. একটি রেজিস্ট্রেশন = একজন অংশগ্রহণকারী",
      paragraphs: [
        "একটি রেজিস্ট্রেশন শুধুমাত্র একজন অংশগ্রহণকারীর জন্য প্রযোজ্য। Seat অন্য কারও নামে transfer করতে হলে আগে থেকে লিখিতভাবে Outbound BD-এর অনুমোদন নিতে হবে।",
      ],
    },
    {
      id: "content-protection",
      heading: "৮. ব্যক্তিগত ব্যবহার ও কনটেন্ট সুরক্ষা",
      paragraphs: [
        "ক্লাসের materials, Zoom link ও recording শুধুমাত্র আপনার ব্যক্তিগত শেখার জন্য। এগুলো রেকর্ড, কপি, শেয়ার, পুনরায় বিক্রি, পুনর্বিতরণ বা publicly upload করা যাবে না।",
      ],
    },
    {
      id: "conduct",
      heading: "৯. আচরণবিধি",
      paragraphs: [
        "লাইভ ক্লাস ও প্রশ্নোত্তর পর্বে সম্মানজনক আচরণ প্রত্যাশিত। অন্য অংশগ্রহণকারী বা ইনস্ট্রাক্টরের প্রতি অসম্মানজনক আচরণ গ্রহণযোগ্য নয়।",
      ],
    },
    {
      id: "removal",
      heading: "১০. অংশগ্রহণকারী অপসারণ",
      paragraphs: [
        "গুরুতর অসদাচরণ, ক্লাসে বিঘ্ন সৃষ্টি, piracy (কনটেন্ট চুরি) বা প্রতারণামূলক payment-এর ক্ষেত্রে Outbound BD কোনো অংশগ্রহণকারীকে ক্লাস থেকে অপসারণ করতে পারে। এমন পরিস্থিতিতে রিফান্ডের কোনো প্রতিশ্রুতি দেওয়া হয় না।",
      ],
    },
    {
      id: "schedule-changes",
      heading: "১১. সময়সূচি বা পরিবর্তন",
      paragraphs: [
        "যৌক্তিক কারণে ক্লাসের সময়সূচি বা ইনস্ট্রাক্টর-সংক্রান্ত ছোটখাটো পরিবর্তন হতে পারে। উল্লেখযোগ্য (material) কোনো পরিবর্তন হলে রেজিস্ট্রেশনের সময় দেওয়া ইমেইলে জানানো হবে।",
      ],
    },
    {
      id: "refunds-link",
      heading: "১২. রিফান্ড",
      paragraphs: [
        "রিফান্ড-সংক্রান্ত সমস্ত নিয়ম Refund Policy দ্বারা নিয়ন্ত্রিত। বিস্তারিত জানতে Refund Policy পড়ুন।",
      ],
    },
    {
      id: "governing-law",
      heading: "১৩. প্রযোজ্য আইন",
      paragraphs: [
        "এই শর্তাবলী বাংলাদেশের প্রযোজ্য আইন অনুযায়ী পরিচালিত হয়। এটি একটি সাধারণ বিবৃতি, এবং কোনো নির্দিষ্ট আদালত বা এখতিয়ারের নিশ্চয়তা হিসেবে বিবেচনা করা উচিত নয়।",
      ],
    },
    {
      id: "statutory-rights",
      heading: "১৪. সংবিধিবদ্ধ অধিকার সুরক্ষিত",
      paragraphs: [
        "এই শর্তাবলি বা রিফান্ড নীতির কোনো কিছুই বাংলাদেশের প্রযোজ্য আইনের অধীনে বাতিল বা সীমিত করা যায় না—এমন কোনো ভোক্তা অধিকারকে সীমিত করে না।",
      ],
    },
    {
      id: "updates-terms",
      heading: "১৫. পরিবর্তন ও যোগাযোগ",
      paragraphs: [legalMeta.updateNotice, "প্রশ্ন থাকলে যোগাযোগ করুন: hello@outboundbd.com"],
    },
  ],
};

export const refundPolicy: LegalPageContent = {
  slug: "refund-policy",
  seoTitle: "Refund Policy | Outbound BD মাস্টারক্লাস",
  metaDescription:
    "Outbound BD-এর মাস্টারক্লাসের জন্য কখন রিফান্ড প্রযোজ্য, কখন নয়, এবং কীভাবে অনুরোধ করবেন—তার সম্পূর্ণ ব্যাখ্যা।",
  eyebrow: "নীতিমালা",
  heading: "Refund Policy",
  intro: [
    "এই Refund Policy স্পষ্টভাবে ব্যাখ্যা করে Outbound BD-এর 2-Day মাস্টারক্লাসের জন্য কখন রিফান্ড দেওয়া হয় এবং কখন দেওয়া হয় না।",
  ],
  sections: [
    {
      id: "general-rule",
      heading: "১. সাধারণ নিয়ম—Non-Refundable",
      paragraphs: [
        "একবার payment সফলভাবে সম্পন্ন হলে, শিক্ষার্থীর নিজের সিদ্ধান্তে বাতিল করার ক্ষেত্রে তা non-refundable। এই পাতায় উল্লেখিত নির্দিষ্ট ব্যতিক্রম ছাড়া কোনো রিফান্ড দেওয়া হয় না।",
      ],
    },
    {
      id: "not-refundable-cases",
      heading: "২. যেসব ক্ষেত্রে রিফান্ড প্রযোজ্য নয়",
      paragraphs: ["নিচের কারণগুলো রিফান্ডের জন্য বিবেচিত হয় না:"],
      items: [
        "লাইভ ক্লাসে উপস্থিত থাকতে না পারা",
        "ব্যক্তিগত সময়সূচির দ্বন্দ্ব",
        "ডিভাইস-সংক্রান্ত সমস্যা",
        "ইন্টারনেট সংযোগ-সংক্রান্ত সমস্যা",
      ],
    },
    {
      id: "recording-not-refund",
      heading: "৩. রেকর্ডিং কোনো রিফান্ড নয়",
      paragraphs: [
        "লাইভ ক্লাসে উপস্থিত থাকতে না পারলেও, রেজিস্ট্রেশনকৃত শিক্ষার্থীদের জন্য ৭ দিনের recording access ঠিকই থাকে। এই recording access কোনো রিফান্ডের বিকল্প নয় এবং এটি প্রদান করার অর্থ এই নয় যে রিফান্ড প্রযোজ্য।",
      ],
    },
    {
      id: "refund-exceptions",
      heading: "৪. যে ক্ষেত্রে পূর্ণ রিফান্ড দেওয়া হয়",
      paragraphs: ["নিচের নির্দিষ্ট পরিস্থিতিতে পূর্ণ (full) রিফান্ড দেওয়া হয়, কোনো processing fee কাটা ছাড়াই:"],
      items: [
        "Outbound BD নিজে মাস্টারক্লাসটি বাতিল করলে—সেক্ষেত্রে সকল রেজিস্ট্রেশনকৃত শিক্ষার্থী পূর্ণ রিফান্ড পাবেন।",
        "Outbound BD উভয় লাইভ ক্লাসের তারিখই payment-এর পর ভিন্ন তারিখে পরিবর্তন করলে, এবং একজন শিক্ষার্থী নতুন তারিখে অংশ নিতে না পারলে—নতুন ক্লাস শুরু হওয়ার আগে অনুরোধ করলে পূর্ণ রিফান্ড দেওয়া হবে।",
        "Verified (যাচাইকৃত) duplicate payment-এর ক্ষেত্রে—অতিরিক্ত (duplicate) amount-এর পূর্ণ রিফান্ড দেওয়া হবে।",
      ],
    },
    {
      id: "pending-not-enrolled",
      heading: "৫. Payment Pending বা Failed মানে নিশ্চিত রেজিস্ট্রেশন নয়",
      paragraphs: [
        "যদি আপনার payment status “pending” বা “failed” দেখায়, তাহলে আপনার রেজিস্ট্রেশন নিশ্চিত (confirmed) নয়। এক্ষেত্রে রিফান্ডের প্রশ্ন আসে না, কারণ কোনো সফল payment গ্রহণ করা হয়নি।",
      ],
    },
    {
      id: "duplicate-verification",
      heading: "৬. Duplicate Payment যাচাইকরণ",
      paragraphs: [
        "Duplicate payment-এর রিফান্ড অনুমোদনের আগে transaction যাচাই করা প্রয়োজন। যাচাই সম্পন্ন হওয়ার পরই রিফান্ড প্রক্রিয়া শুরু হবে।",
      ],
    },
    {
      id: "refund-method",
      heading: "৭. রিফান্ড কীভাবে ফেরত দেওয়া হয়",
      paragraphs: [
        "অনুমোদিত রিফান্ড মূল payment পদ্ধতিতে অথবা যাচাইয়ের পর আইনগতভাবে উপযুক্ত অন্য কোনো পদ্ধতিতে ফেরত দেওয়া হবে।",
      ],
    },
    {
      id: "how-to-request",
      heading: "৮. রিফান্ডের জন্য কীভাবে যোগাযোগ করবেন",
      paragraphs: [
        "রিফান্ড অনুরোধ করতে hello@outboundbd.com-এ ইমেইল করুন এবং সঙ্গে দিন আপনার রেজিস্ট্রেশনে ব্যবহৃত ইমেইল ঠিকানা এবং একটি নিরাপদ payment reference (যেমন transaction ID)।",
        "গুরুত্বপূর্ণ: আমরা কখনোই আপনার PIN, OTP বা সম্পূর্ণ card তথ্য ইমেইলে পাঠাতে বলব না। এই ধরনের তথ্য কখনো শেয়ার করবেন না।",
      ],
    },
    {
      id: "processing-time",
      heading: "৯. প্রসেসিং সময়",
      paragraphs: [
        "অনুমোদিত রিফান্ড প্রসেস হতে যে সময় লাগে তা payment provider বা ব্যাংকের নিজস্ব প্রক্রিয়ার উপর নির্ভর করে। আমরা কোনো নির্দিষ্ট settlement সময়ের প্রতিশ্রুতি দিচ্ছি না।",
      ],
    },
    {
      id: "statutory-rights",
      heading: "১০. সংবিধিবদ্ধ অধিকার সুরক্ষিত",
      paragraphs: [
        "এই রিফান্ড নীতি বা শর্তাবলির কোনো কিছুই বাংলাদেশের প্রযোজ্য আইনের অধীনে বাতিল বা সীমিত করা যায় না—এমন কোনো ভোক্তা অধিকারকে সীমিত করে না।",
      ],
    },
    {
      id: "related-policies",
      heading: "১১. সম্পর্কিত নীতিমালা",
      paragraphs: [
        "সম্পূর্ণ শর্তাবলীর জন্য Terms and Conditions এবং তথ্য সংক্রান্ত বিস্তারিত জানতে Privacy Policy দেখুন।",
        legalMeta.updateNotice,
        "প্রশ্ন থাকলে যোগাযোগ করুন: hello@outboundbd.com",
      ],
    },
  ],
};
