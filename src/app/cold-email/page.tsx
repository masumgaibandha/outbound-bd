import type { Metadata } from "next";

import { GET_DETAILS_ID } from "@/components/agencies/agency-anchors";
import { AgencyFaqSection } from "@/components/agencies/agency-faq-section";
import { AgencyHeroSection } from "@/components/agencies/agency-hero-section";
import { AgencyHowItWorksSection } from "@/components/agencies/agency-how-it-works-section";
import { AgencyLeadForm } from "@/components/agencies/agency-lead-form";
import { AgencyStickyCta } from "@/components/agencies/agency-sticky-cta";
import { ColdEmailFamiliarSection } from "@/components/cold-email/cold-email-familiar-section";
import { ColdEmailProofSection } from "@/components/cold-email/cold-email-proof-section";
import { ColdEmailWhyFailsSection } from "@/components/cold-email/cold-email-why-fails-section";
import {
  COLD_EMAIL_FAQ_ITEMS,
  COLD_EMAIL_HERO_COPY,
  COLD_EMAIL_INCLUSIONS,
  COLD_EMAIL_STEPS,
} from "@/components/cold-email/cold-email-copy";
import { Section } from "@/components/public/section";
import { SectionHeading } from "@/components/public/section-heading";

export const metadata: Metadata = {
  title: "Cold Email Outreach, Done for You",
  description:
    "More sales conversations, without chasing leads yourself. I set up and run cold email outreach for B2B businesses.",
};

/**
 * The /agencies page's structure and components, pointed at B2B owners and
 * founders instead of agencies. No pricing or margin section on this page.
 * Proof sits above the form. Section backgrounds alternate so each band
 * separates: "Sound familiar?", "Why most cold email fails" and how it works
 * on the deeper canvas-alt tone, form and FAQ on cream, and proof on its own
 * gold tint. The hero is compact so its four points fit a laptop viewport.
 */
export default function ColdEmailLandingPage() {
  return (
    <>
      <AgencyHeroSection copy={COLD_EMAIL_HERO_COPY} compact />
      <ColdEmailFamiliarSection />
      <ColdEmailProofSection />
      <ColdEmailWhyFailsSection />

      {/* scroll-mt clears the sticky AgenciesHeader (h-16 / md:h-20). */}
      <Section
        id={GET_DETAILS_ID}
        tone="canvas"
        labelledBy="get-details-heading"
        className="scroll-mt-16 md:scroll-mt-20"
      >
        <div className="mx-auto max-w-xl">
          <div id="get-details-heading">
            <SectionHeading title="Tell me about your business" />
          </div>
          <p className="text-ink-muted mt-4 text-center text-base md:text-lg">
            Takes 30 seconds. I reply within one business day.
          </p>
          <div className="mt-10">
            <AgencyLeadForm variant="cold-email" />
          </div>
        </div>
      </Section>

      <AgencyHowItWorksSection steps={COLD_EMAIL_STEPS} inclusions={COLD_EMAIL_INCLUSIONS} />
      <AgencyFaqSection items={COLD_EMAIL_FAQ_ITEMS} tone="canvas" />
      <AgencyStickyCta />
    </>
  );
}
