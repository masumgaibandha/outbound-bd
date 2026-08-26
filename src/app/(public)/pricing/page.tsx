import type { Metadata } from "next";

import { FinalCtaSection } from "@/components/public/final-cta-section";
import { OneTimeOfferSection } from "@/components/public/one-time-offer-section";
import { PricingPlanCard } from "@/components/public/pricing-plan-card";
import { SectionHeading } from "@/components/public/section-heading";
import { CheckIcon } from "@/components/public/icons";
import {
  MANAGED_OUTREACH_INCLUSIONS,
  MANAGED_PLANS,
  ONE_TIME_CATEGORIES,
  getOneTimeOffersByCategory,
} from "@/lib/pricing-catalog";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Outbound BD pricing: Managed Outreach plans and one-time services for infrastructure setup, verified leads, deliverability, and consultations.",
};

export default function PricingPage() {
  return (
    <>
      <section className="border-b border-hairline">
        <div className="mx-auto max-w-3xl px-4 pt-16 pb-12 text-center sm:px-6 sm:pt-20 sm:pb-16">
          <p className="text-xs font-semibold tracking-[0.14em] text-royal uppercase">
            Pricing
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance text-ink sm:text-4xl lg:text-5xl">
            Managed plans and one-time services
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-pretty text-subtext">
            Choose a fully managed plan for an ongoing program, or a
            one-time service if you only need a specific piece done.
          </p>

          <div className="mt-8 rounded-xl border border-hairline bg-canvas p-5 text-left">
            <p className="text-sm leading-relaxed text-subtext">
              <span className="font-semibold text-ink">
                Not included in any price below:
              </span>{" "}
              domains, mailboxes, sending tools, and other third-party
              subscriptions — these are billed directly by their providers,
              not by us. And while we run every program to a high standard,
              reply and meeting volume depends on your market and offer, so
              results are never guaranteed.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="Managed Outreach"
            title="Fully managed cold email programs"
            description="Every plan includes the same disciplines end to end — the tiers differ in scope, not in what's covered."
          />

          <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {MANAGED_PLANS.map((plan) => (
              <PricingPlanCard key={plan.id} plan={plan} />
            ))}
          </div>

          <div className="mt-14 border-t border-hairline pt-10">
            <h3 className="text-sm font-semibold tracking-[0.08em] text-ink uppercase">
              Included in every plan
            </h3>
            <ul className="mt-5 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
              {MANAGED_OUTREACH_INCLUSIONS.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-subtext">
                  <CheckIcon width={16} height={16} className="mt-0.5 shrink-0 text-royal" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-hairline py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="One-time services"
            title="Need just one piece done?"
            description="No ongoing commitment — pay once for a specific deliverable."
          />

          <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-2">
            {ONE_TIME_CATEGORIES.map((category) => (
              <OneTimeOfferSection
                key={category.id}
                label={category.label}
                offers={getOneTimeOffersByCategory(category.id)}
              />
            ))}
          </div>
        </div>
      </section>

      <FinalCtaSection
        heading="Not sure which option fits?"
        description="Tell us about your goals and budget — we'll recommend the right plan or one-time service."
        secondaryHref="/faq"
        secondaryLabel="Read the FAQ"
      />
    </>
  );
}
