import { CampaignEvidencePreviewSection } from "@/components/public/campaign-evidence-preview-section";
import { FinalCtaSection } from "@/components/public/final-cta-section";
import { HeroSection } from "@/components/public/hero-section";
import { PricingTeaserSection } from "@/components/public/pricing-teaser-section";
import { ProcessSection } from "@/components/public/process-section";
import { ServicesSection } from "@/components/public/services-section";
import { TestimonialsSection } from "@/components/public/testimonials-section";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ServicesSection />
      <ProcessSection compact />
      <CampaignEvidencePreviewSection />
      <TestimonialsSection />
      <PricingTeaserSection />
      <FinalCtaSection />
    </>
  );
}
