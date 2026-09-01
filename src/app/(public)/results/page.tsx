import type { Metadata } from "next";
import Link from "next/link";

import { CampaignEvidenceSection } from "@/components/public/campaign-evidence-section";
import { Container } from "@/components/public/container";
import { FinalCtaSection } from "@/components/public/final-cta-section";
import { ResultsSection } from "@/components/public/results-section";
import { Section } from "@/components/public/section";
import { SectionHeading } from "@/components/public/section-heading";
import { TestimonialCard } from "@/components/public/testimonial-card";
import { testimonials } from "@/components/public/testimonials-data";

export const metadata: Metadata = {
  title: "Results",
  description:
    "Real evidence from Abdullah Al Masum's independent client work, plus how Outbound BD publishes agency case studies as engagements complete.",
};

export default function ResultsPage() {
  return (
    <>
      <section className="hero-wash relative border-b border-hairline">
        <Container className="max-w-3xl pt-16 pb-12 text-center sm:pt-20 sm:pb-16">
          <p className="text-ink-muted text-xs font-semibold tracking-[0.18em] uppercase">
            Results
          </p>
          <h1 className="font-heading text-ink type-section mt-4 text-balance">
            Real evidence, published honestly
          </h1>
          <p className="text-ink-muted mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-pretty">
            We only publish a metric once the client who ran the campaign has
            reviewed and approved it. Here&apos;s what real evidence exists
            today, and how each future case study will be added.
          </p>
        </Container>
      </section>

      <Section tone="canvas" labelledBy="evidence-heading">
        <SectionHeading
          eyebrow="Available today"
          title="Selected results from Abdullah Al Masum's independent work"
          description="The same discipline every Outbound BD engagement is run on."
          align="left"
        />
        <div className="mt-14">
          <CampaignEvidenceSection />
        </div>
      </Section>

      <ResultsSection />

      <Section tone="canvas" labelledBy="testimonials-heading">
        <SectionHeading
          eyebrow="Client feedback"
          title="Verified client feedback from Abdullah Al Masum"
          align="left"
        />
        <ul className="mt-14 grid auto-rows-fr gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <li key={testimonial.id} className="h-full" data-reveal>
              <TestimonialCard testimonial={testimonial} />
            </li>
          ))}
        </ul>
      </Section>

      <section className="border-hairline border-t py-16 sm:py-20">
        <Container className="max-w-3xl text-center">
          <h2 className="font-heading text-ink text-2xl tracking-tight">
            Have a campaign we ran together?
          </h2>
          <p className="text-ink-muted mt-3 text-base leading-relaxed">
            If you&apos;re a client and would like your results featured
            here, we&apos;ll send the exact figures for your review before
            anything is published.
          </p>
          <Link
            href="/contact"
            className="text-action hover:text-action-hover focus-visible:outline-action mt-5 inline-block rounded-sm text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            Get in touch →
          </Link>
        </Container>
      </section>

      <FinalCtaSection
        heading="Want to be the next result on this page?"
        secondaryHref="/pricing"
        secondaryLabel="See pricing guidance"
      />
    </>
  );
}
