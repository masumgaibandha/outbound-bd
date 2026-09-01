/**
 * Every quote here is transcribed verbatim from real Upwork/Fiverr review
 * screenshots (source: masumdev.com's design reference, itself sourced from
 * the founder's actual client feedback) — nothing here is invented or
 * paraphrased. Client names are withheld because the source reviews redact
 * them; do not add names that aren't in the source.
 *
 * These are the founder's individual freelance track record, not Outbound
 * BD campaign case studies (Outbound BD is a newer agency identity — see
 * /results for agency-level case studies, which will populate as real,
 * client-approved engagements complete). Attribution is worded to reflect
 * that honestly, per explicit instruction: "Verified client feedback from
 * Abdullah Al Masum" — never implied to be an Outbound BD engagement.
 */
export type Testimonial = {
  id: string;
  quote: string;
  context: string;
  source: "Upwork" | "Fiverr";
};

export const testimonialsIntro = {
  eyebrow: "Client Feedback",
  title: "Verified client feedback from Abdullah Al Masum",
  description:
    "Founder Abdullah Al Masum's individual track record on cold email campaigns, deliverability, and outreach infrastructure — transcribed verbatim from real Upwork and Fiverr reviews.",
} as const;

export const testimonials: readonly Testimonial[] = [
  {
    id: "upwork-cold-email-campaigns",
    quote:
      "Great freelancer. Excellent work on cold email campaigns. We had 60 inboxes and all of them had a 95%+ health score, and over a 50% open rate. Very good!",
    context: "Cold Email Campaigns",
    source: "Upwork",
  },
  {
    id: "fiverr-technical-detail",
    quote:
      "Masum was very good to work with. He provided us with many technical details we could not have received without his knowledge and experience. I probably asked more questions than the average customer and he was always professional and very responsive. I would definitely recommend him and work with him again.",
    context: "Cold Email Infrastructure",
    source: "Fiverr",
  },
  {
    id: "upwork-multiple-domains",
    quote:
      "Masum was a pleasure to work with -- we had the challenging task of establishing multiple domains for cold outreach for a SaaS startup and Masum handled everything, including gathering leads, setting up the platform (Instantly), and managing the outreach. Hit some snafus with deliverability.. the only downside, but not preventable. Overall he was a pleasure to work with.",
    context: "Instantly.AI Setup & Email Outreach Optimization",
    source: "Upwork",
  },
  {
    id: "fiverr-repeat-client",
    quote:
      "Excellent experience working together. Communication was clear, delivery was on time, and the quality of work met expectations. Professional, responsive, and easy to collaborate with. Would recommend and work together again.",
    context: "Repeat Client · Cold Emails",
    source: "Fiverr",
  },
  {
    id: "upwork-sixth-project",
    quote: "This is out 6th project with Masum. Great work and responsiveness as always",
    context: "AI Email Campaign Specialist — Saleshandy / Instantly",
    source: "Upwork",
  },
  {
    id: "fiverr-amazing-as-always",
    quote:
      "Amazing as always. really wants to help, always available to make changes. highly recommend.",
    context: "Repeat Client · Cold Emails",
    source: "Fiverr",
  },
];
