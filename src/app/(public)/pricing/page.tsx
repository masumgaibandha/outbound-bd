import type { Metadata } from "next";

import { Container } from "@/components/public/container";
import { FinalCtaSection } from "@/components/public/final-cta-section";
import { OneTimeOfferSection } from "@/components/public/one-time-offer-section";
import { PricingPlanCard } from "@/components/public/pricing-plan-card";
import { SectionHeading } from "@/components/public/section-heading";
import { Section } from "@/components/public/section";
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
      <section className="hero-wash relative border-b border-hairline">
        <Container className="max-w-3xl pt-16 pb-12 text-center sm:pt-20 sm:pb-16">
          <p className="text-ink-muted text-xs font-semibold tracking-[0.18em] uppercase">
            Pricing
          </p>
          <h1 className="font-heading text-ink type-section mt-4 text-balance">
            Managed plans and one-time services
          </h1>
          <p className="text-ink-muted mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-pretty">
            Choose a fully managed plan for an ongoing program, or a
            one-time service if you only need a specific piece done.
          </p>

          <div className="border-hairline bg-surface mt-8 border p-5 text-left">
            <p className="text-ink-muted text-sm leading-relaxed">
              <span className="text-ink font-semibold">
                Not included in any price below:
              </span>{" "}
              domains, mailboxes, sending tools, and other third-party
              subscriptions — these are billed directly by their providers,
              not by us. And while we run every program to a high standard,
              reply and meeting volume depends on your market and offer, so
              results are never guaranteed.
            </p>
          </div>
        </Container>
      </section>

      <Section tone="canvas" labelledBy="managed-plans-heading">
        <SectionHeading
          eyebrow="Managed Outreach"
          title="Fully managed cold email programs"
          description="Every plan includes the same disciplines end to end — the tiers differ in scope, not in what's covered."
        />

        <ul className="mt-14 grid items-stretch gap-6 lg:grid-cols-3">
          {MANAGED_PLANS.map((plan) => (
            <li key={plan.id} className="flex h-full">
              <PricingPlanCard plan={plan} />
            </li>
          ))}
        </ul>

        <div className="border-hairline mt-14 border-t pt-10">
          <h3 className="text-ink text-xs font-semibold tracking-[0.16em] uppercase">
            Included in every plan
          </h3>
          <ul className="mt-5 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
            {MANAGED_OUTREACH_INCLUSIONS.map((item) => (
              <li key={item} className="text-ink-muted flex items-start gap-2.5 text-sm">
                <CheckIcon width={16} height={16} className="text-action mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section tone="canvasAlt" labelledBy="one-time-services-heading">
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
      </Section>

      <FinalCtaSection
        heading="Not sure which option fits?"
        description="Tell us about your goals and budget — we'll recommend the right plan or one-time service."
        secondaryHref="/faq"
        secondaryLabel="Read the FAQ"
      />
    </>
  );
}
