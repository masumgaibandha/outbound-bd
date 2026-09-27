import { ButtonLink } from "@/components/public/button";
import { HOME_PRICING } from "@/components/public/home-copy";
import { SectionHeading } from "@/components/public/section-heading";
import { Section } from "@/components/public/section";
import { getStartingMonthlyPriceLabel } from "@/lib/pricing-catalog";

/**
 * Homepage pricing overview: one starting price, read from the catalog, and
 * a route to the full plan cards on /pricing. Guidance, not a purchase flow.
 */
export function PricingTeaserSection() {
  return (
    <Section id="pricing" tone="canvas" labelledBy="pricing-heading" compact>
      <div id="pricing-heading">
        <SectionHeading eyebrow={HOME_PRICING.eyebrow} title={HOME_PRICING.heading} />
      </div>

      <div className="mx-auto mt-6 max-w-2xl text-center" data-reveal>
        <p className="text-ink text-lg leading-relaxed md:text-xl" data-testid="home-pricing-starting">
          {HOME_PRICING.startingLine(getStartingMonthlyPriceLabel())}
        </p>
        <p className="text-ink-muted mt-3 text-sm leading-relaxed">{HOME_PRICING.notIncluded}</p>
        <div className="mt-8">
          <ButtonLink href={HOME_PRICING.ctaHref} tone="outline" size="lg">
            {HOME_PRICING.ctaLabel}
          </ButtonLink>
        </div>
      </div>
    </Section>
  );
}
