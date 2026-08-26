import { CredibilityStrip } from "@/components/public/credibility-strip";
import { FaqSection } from "@/components/public/faq-section";
import { FinalCtaSection } from "@/components/public/final-cta-section";
import { HeroSection } from "@/components/public/hero-section";
import { ProcessSection } from "@/components/public/process-section";
import { ResultsSection } from "@/components/public/results-section";
import { ServicesSection } from "@/components/public/services-section";
import { ToolsSection } from "@/components/public/tools-section";
import { WhySection } from "@/components/public/why-section";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <CredibilityStrip />
      <ServicesSection />
      <ProcessSection />
      <ResultsSection />
      <ToolsSection />
      <WhySection />
      <FaqSection />
      <FinalCtaSection />
    </>
  );
}
