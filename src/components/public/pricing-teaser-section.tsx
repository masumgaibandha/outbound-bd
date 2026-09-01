import Link from "next/link";

import { PricingPlanCard } from "@/components/public/pricing-plan-card";
import { SectionHeading } from "@/components/public/section-heading";
import { Section } from "@/components/public/section";
import { MANAGED_PLANS } from "@/lib/pricing-catalog";

/**
 * Homepage pricing guidance — starting points to qualify a prospect before
 * they reach the full /pricing page, not a purchase flow.
 */
export function PricingTeaserSection() {
  return (
    <Section id="pricing" tone="canvas" labelledBy="pricing-heading">
      <SectionHeading
        eyebrow="Pricing guidance"
        title="Starting points for a managed program"
        description="Every engagement is scoped on a call — these are transparent starting figures, not instant checkout prices."
      />

      <ul className="mt-14 grid items-stretch gap-6 lg:grid-cols-3">
        {MANAGED_PLANS.map((plan) => (
          <li key={plan.id} className="flex h-full" data-reveal>
            <PricingPlanCard plan={plan} />
          </li>
        ))}
      </ul>

      <div className="mt-8 text-center">
        <Link
          href="/pricing"
          className="text-ink decoration-action hover:text-action focus-visible:outline-action rounded-sm text-sm font-medium underline decoration-2 underline-offset-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          See full pricing guidance →
        </Link>
      </div>
    </Section>
  );
}
