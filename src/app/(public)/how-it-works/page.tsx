import type { Metadata } from "next";

import { FinalCtaSection } from "@/components/public/final-cta-section";
import { HowItWorksStages } from "@/components/public/how-it-works-stages";
import { RequirementsSection } from "@/components/public/requirements-section";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "How an Outbound BD engagement runs end to end: discovery, targeting, infrastructure, copy, campaign launch, optimization, and reporting — plus what we need from you along the way.",
};

const CLIENT_RESPONSIBILITIES = [
  "Join the initial discovery session and share context on your ICP, past customers, and positioning",
  "Approve a sending domain setup separate from your primary company domain",
  "Review and sign off on messaging before sequences go live",
  "Provide CRM or calendar access so booked meetings land in your pipeline",
  "Stay reachable for questions that come up as sequences are tested and refined",
  "Flag any changes to your offer, pricing, or target market as they happen",
];

export default function HowItWorksPage() {
  return (
    <>
      <section className="border-b border-hairline">
        <div className="mx-auto max-w-3xl px-4 pt-16 pb-16 text-center sm:px-6 sm:pt-20 sm:pb-20">
          <p className="text-xs font-semibold tracking-[0.14em] text-royal uppercase">
            How it works
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance text-ink sm:text-4xl lg:text-5xl">
            One connected program, from discovery to reporting
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-pretty text-subtext">
            Every engagement runs through the same seven stages. Here&apos;s
            what happens at each one, and what we need from you along the
            way.
          </p>
        </div>
      </section>

      <HowItWorksStages />
      <RequirementsSection items={CLIENT_RESPONSIBILITIES} />

      <FinalCtaSection
        heading="Ready to get started?"
        secondaryHref="/contact"
        secondaryLabel="Send a project inquiry"
      />
    </>
  );
}
