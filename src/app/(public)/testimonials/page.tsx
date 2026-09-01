import type { Metadata } from "next";

import { Container } from "@/components/public/container";
import { FinalCtaSection } from "@/components/public/final-cta-section";
import { Section } from "@/components/public/section";
import { TestimonialsGrid } from "@/components/public/testimonials-grid";
import { testimonials, testimonialsIntro } from "@/components/public/testimonials-data";

export const metadata: Metadata = {
  title: "Testimonials",
  description: testimonialsIntro.description,
};

export default function TestimonialsPage() {
  return (
    <>
      <section className="hero-wash relative border-b border-hairline">
        <Container className="max-w-3xl pt-16 pb-12 text-center sm:pt-20 sm:pb-16">
          <p className="text-ink-muted text-xs font-semibold tracking-[0.18em] uppercase">
            {testimonialsIntro.eyebrow}
          </p>
          <h1 className="font-heading text-ink type-section mt-4 text-balance">
            {testimonialsIntro.title}
          </h1>
          <p className="text-ink-muted mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-pretty">
            {testimonialsIntro.description}
          </p>
        </Container>
      </section>

      <Section tone="canvas">
        <TestimonialsGrid items={testimonials} />
      </Section>

      <FinalCtaSection
        heading="Want results like these for your pipeline?"
        secondaryHref="/results"
        secondaryLabel="See how we track results"
      />
    </>
  );
}
