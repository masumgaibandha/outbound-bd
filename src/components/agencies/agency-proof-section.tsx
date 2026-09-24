import { AgencyFeaturedEvidence } from "@/components/agencies/agency-featured-evidence";
import { campaignEvidence } from "@/components/public/campaign-evidence-data";
import { Section } from "@/components/public/section";
import { SectionHeading } from "@/components/public/section-heading";
import { TestimonialCard } from "@/components/public/testimonial-card";
import { testimonials } from "@/components/public/testimonials-data";

export const AGENCY_EVIDENCE_ID = "instantly-2025-08-05";
export const AGENCY_EVIDENCE_CAPTION =
  "Real client campaigns. Results vary by offer and market.";

// The Instantly campaign-performance screenshot, with this page's one-line
// caption swapped in and its note dropped, for display only (both inline
// and in the lightbox). The shared data file is never mutated, so the
// homepage and /results keep their full caption and note.
const sourceEvidence = campaignEvidence.find((item) => item.id === AGENCY_EVIDENCE_ID);
if (!sourceEvidence) {
  throw new Error(`Campaign evidence "${AGENCY_EVIDENCE_ID}" not found`);
}
const evidence = { ...sourceEvidence, caption: AGENCY_EVIDENCE_CAPTION, note: undefined };

// Two existing, verified testimonials most relevant to an agency audience:
// multi-domain/multi-client setup, and inbox-health/open-rate numbers.
// Transcribed verbatim in testimonials-data.ts; nothing reworded here.
const featuredTestimonialIds = ["upwork-multiple-domains", "upwork-cold-email-campaigns"];
const featuredTestimonials = testimonials.filter((testimonial) =>
  featuredTestimonialIds.includes(testimonial.id),
);

export function AgencyProofSection() {
  return (
    <Section tone="canvas" labelledBy="agency-proof-heading">
      <div id="agency-proof-heading">
        <SectionHeading title="Real campaigns, real numbers" />
      </div>

      {/* One column and a larger quote size for readability. The shared
          TestimonialCard leaves the quote's font size to inherit, so the
          wrapper sets it without touching the card itself. */}
      <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-6 md:text-lg">
        {featuredTestimonials.map((testimonial) => (
          <TestimonialCard key={testimonial.id} testimonial={testimonial} />
        ))}
      </div>

      <div className="mt-14">
        <AgencyFeaturedEvidence item={evidence} />
      </div>
    </Section>
  );
}
