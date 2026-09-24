import type { Metadata } from "next";

import { GET_DETAILS_ID } from "@/components/agencies/agency-anchors";
import { AgencyFaqSection } from "@/components/agencies/agency-faq-section";
import { AgencyHeroSection } from "@/components/agencies/agency-hero-section";
import { AgencyHowItWorksSection } from "@/components/agencies/agency-how-it-works-section";
import { AgencyLeadForm } from "@/components/agencies/agency-lead-form";
import { AgencyMathSection } from "@/components/agencies/agency-math-section";
import { AgencyProofSection } from "@/components/agencies/agency-proof-section";
import { AgencyStickyCta } from "@/components/agencies/agency-sticky-cta";
import { Section } from "@/components/public/section";
import { SectionHeading } from "@/components/public/section-heading";

export const metadata: Metadata = {
  title: "White-Label Cold Email for Agencies",
  description:
    "Add cold email to your agency without hiring for it. I set up and run cold email outreach for your clients under your brand.",
};

export default function AgenciesLandingPage() {
  return (
    <>
      <AgencyHeroSection />
      <AgencyMathSection />

      {/* scroll-mt clears the sticky AgenciesHeader (h-16 / md:h-20). */}
      <Section
        id={GET_DETAILS_ID}
        tone="canvas"
        labelledBy="get-details-heading"
        className="scroll-mt-16 md:scroll-mt-20"
      >
        <div className="mx-auto max-w-xl">
          <div id="get-details-heading">
            <SectionHeading title="Get the white-label details" />
          </div>
          <p className="text-ink-muted mt-4 text-center text-base md:text-lg">
            Takes 30 seconds. I reply within one business day.
          </p>
          <div className="mt-10">
            <AgencyLeadForm />
          </div>
        </div>
      </Section>

      <AgencyHowItWorksSection />
      <AgencyProofSection />
      <AgencyFaqSection />
      <AgencyStickyCta />
    </>
  );
}
