import type { Metadata } from "next";

import { AboutHero } from "@/components/public/about-hero";
import { FinalCtaSection } from "@/components/public/final-cta-section";
import { FounderTeaser } from "@/components/public/founder-teaser";
import { WhySection } from "@/components/public/why-section";

export const metadata: Metadata = {
  title: "About",
  description:
    "Outbound BD is a founder-led B2B lead generation and cold email agency, built to combine targeting, infrastructure, messaging, deliverability, campaign execution, and reporting under one accountable service.",
};

export default function AboutPage() {
  return (
    <>
      <AboutHero />
      <FounderTeaser />
      <WhySection />
      <FinalCtaSection
        heading="Ready to talk about your outbound program?"
        secondaryHref="/contact"
        secondaryLabel="Request a Proposal"
      />
    </>
  );
}
