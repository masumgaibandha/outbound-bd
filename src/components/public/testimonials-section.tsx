import Link from "next/link";

import { SectionHeading } from "@/components/public/section-heading";
import { Section } from "@/components/public/section";
import { TestimonialCard } from "@/components/public/testimonial-card";
import { testimonials, testimonialsIntro } from "@/components/public/testimonials-data";

export function TestimonialsSection() {
  const featured = testimonials.slice(0, 3);

  return (
    <Section id="testimonials" tone="canvasAlt" labelledBy="testimonials-heading">
      <SectionHeading
        eyebrow={testimonialsIntro.eyebrow}
        title={testimonialsIntro.title}
        description={testimonialsIntro.description}
        align="left"
      />

      <ul className="mt-14 grid auto-rows-fr gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((testimonial) => (
          <li key={testimonial.id} className="h-full" data-reveal>
            <TestimonialCard testimonial={testimonial} />
          </li>
        ))}
      </ul>

      <div className="mt-10">
        <Link
          href="/testimonials"
          className="text-ink decoration-action hover:text-action focus-visible:outline-action rounded-sm text-sm font-medium underline decoration-2 underline-offset-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          Read all testimonials →
        </Link>
      </div>
    </Section>
  );
}
