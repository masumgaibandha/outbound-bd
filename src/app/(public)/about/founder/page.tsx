import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/public/container";
import { ExpertiseSection } from "@/components/public/expertise-section";
import { FinalCtaSection } from "@/components/public/final-cta-section";
import { FounderSection } from "@/components/public/founder-section";
import { FounderToolsSection } from "@/components/public/founder-tools-section";

export const metadata: Metadata = {
  title: "About the Founder",
  description:
    "Abdullah Al Masum, founder of Outbound BD: 10+ years in B2B lead generation and cold email outreach, Upwork Top Rated, based in Bangladesh serving clients worldwide.",
};

export default function FounderPage() {
  return (
    <>
      <Container className="pt-8">
        <nav aria-label="Breadcrumb" className="text-ink-muted text-sm">
          <Link href="/about" className="hover:text-ink transition-colors">
            About
          </Link>
          <span className="mx-2">/</span>
          <span className="text-ink/70">The Founder</span>
        </nav>
      </Container>

      <FounderSection />
      <ExpertiseSection />
      <FounderToolsSection />

      <FinalCtaSection
        heading="Ready to talk about your outbound program?"
        secondaryHref="/contact"
        secondaryLabel="Request a Proposal"
      />
    </>
  );
}
