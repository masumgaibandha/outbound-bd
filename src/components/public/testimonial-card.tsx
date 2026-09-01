import type { Testimonial } from "@/components/public/testimonials-data";

export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <figure className="card-static border-hairline bg-surface border p-7 md:flex md:h-full md:flex-col md:p-8">
      <span className="border-hairline text-ink-muted mb-4 inline-block w-fit rounded-full border px-2.5 py-1 text-xs font-medium">
        <span className="sr-only">Reviewed on </span>
        {testimonial.source}
      </span>
      <blockquote className="text-ink leading-relaxed">
        <p>&ldquo;{testimonial.quote}&rdquo;</p>
      </blockquote>
      <figcaption className="border-hairline mt-6 border-t pt-5 md:mt-auto">
        <span className="text-ink block text-sm font-medium">
          Verified client feedback from Abdullah Al Masum
        </span>
        {/*
         * Reserve two lines' worth of height for the context label only in
         * the md range (768–1023px) where the two-column layout is narrow
         * enough for longer labels to wrap — that's what was pushing one
         * card's divider out of alignment with its row partner. Reset to
         * natural height at lg+, where the wider column never wraps.
         */}
        <span className="text-ink-muted mt-1 block text-sm md:min-h-10 lg:min-h-0">
          {testimonial.context}
        </span>
      </figcaption>
    </figure>
  );
}
