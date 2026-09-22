import { Section } from "@/components/public/section";
import { SectionHeading } from "@/components/public/section-heading";
import { getStartingMonthlyPriceLabel } from "@/lib/pricing-catalog";

export function AgencyPricingSection() {
  const startingPrice = getStartingMonthlyPriceLabel();

  return (
    <Section tone="canvasAlt" labelledBy="agency-pricing-heading">
      <SectionHeading
        eyebrow="Pricing"
        title="Simple pricing per client campaign"
        description={`Plans start at ${startingPrice}/month per client campaign. Bigger setups get a custom quote.`}
      />
    </Section>
  );
}
