import { CampaignEvidenceSection } from "@/components/public/campaign-evidence-section";
import { getFeaturedEvidence } from "@/components/public/campaign-evidence-data";
import { Section } from "@/components/public/section";
import { SectionHeading } from "@/components/public/section-heading";
import { TestimonialCard } from "@/components/public/testimonial-card";
import { testimonials } from "@/components/public/testimonials-data";

// Same two screenshots already shown on the homepage (getFeaturedEvidence())
// — no new evidence, nothing invented.
const evidence = getFeaturedEvidence();

// Two existing, verified testimonials most relevant to an agency audience —
// multi-domain/multi-client setup, and inbox-health/open-rate numbers.
// Transcribed verbatim in testimonials-data.ts; nothing reworded here.
const featuredTestimonialIds = ["upwork-multiple-domains", "upwork-cold-email-campaigns"];
const featuredTestimonials = testimonials.filter((testimonial) =>
  featuredTestimonialIds.includes(testimonial.id),
);

export function AgencyProofSection() {
  return (
    <Section tone="canvas" labelledBy="proof-heading">
      <SectionHeading eyebrow="Proof" title="Real campaigns, real numbers" />

      <div className="mt-14">
        <CampaignEvidenceSection items={evidence} />
      </div>

      <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
        {featuredTestimonials.map((testimonial) => (
          <TestimonialCard key={testimonial.id} testimonial={testimonial} />
        ))}
      </div>
    </Section>
  );
}
