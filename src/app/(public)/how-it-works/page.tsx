import type { Metadata } from "next";

import { Container } from "@/components/public/container";
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
      <section className="hero-wash relative border-b border-hairline">
        <Container className="max-w-3xl pt-16 pb-16 text-center sm:pt-20 sm:pb-20">
          <p className="text-ink-muted text-xs font-semibold tracking-[0.18em] uppercase">
            How it works
          </p>
          <h1 className="font-heading text-ink type-section mt-4 text-balance">
            One connected program, from discovery to reporting
          </h1>
          <p className="text-ink-muted mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-pretty">
            Every engagement runs through the same seven stages. Here&apos;s
            what happens at each one, and what we need from you along the
            way.
          </p>
        </Container>
      </section>

      <HowItWorksStages />
      <RequirementsSection items={CLIENT_RESPONSIBILITIES} />

      <FinalCtaSection
        heading="Ready to get started?"
        secondaryHref="/contact"
        secondaryLabel="Request a Proposal"
      />
    </>
  );
}
