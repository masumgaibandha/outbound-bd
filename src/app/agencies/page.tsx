import type { Metadata } from "next";

import { AgencyComparisonSection } from "@/components/agencies/agency-comparison-section";
import { AgencyFaqSection } from "@/components/agencies/agency-faq-section";
import { AgencyHeroSection } from "@/components/agencies/agency-hero-section";
import { AgencyHowItWorksSection } from "@/components/agencies/agency-how-it-works-section";
import { AgencyLeadForm } from "@/components/agencies/agency-lead-form";
import { AgencyPricingSection } from "@/components/agencies/agency-pricing-section";
import { AgencyProofSection } from "@/components/agencies/agency-proof-section";
import { AgencyWhatsIncludedSection } from "@/components/agencies/agency-whats-included-section";
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
      <AgencyComparisonSection />
      <AgencyHowItWorksSection />
      <AgencyWhatsIncludedSection />
      <AgencyProofSection />
      <AgencyPricingSection />

      <Section tone="canvasAlt" labelledBy="lead-form-heading">
        <div className="mx-auto max-w-xl">
          <SectionHeading title="See if it's a fit" />
          <div className="mt-10">
            <AgencyLeadForm />
          </div>
        </div>
      </Section>

      <AgencyFaqSection />
    </>
  );
}
