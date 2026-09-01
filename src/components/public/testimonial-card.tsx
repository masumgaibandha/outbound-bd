import type { Testimonial } from "@/components/public/testimonials-data";

export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <figure className="card-static border-hairline bg-surface flex h-full flex-col border p-7">
      <p className="text-ink-muted text-xs font-semibold tracking-[0.16em] uppercase">
        <span className="sr-only">Reviewed on </span>
        {testimonial.source}
      </p>
      <blockquote className="text-ink mt-4 flex-1 leading-relaxed">
        <p>&ldquo;{testimonial.quote}&rdquo;</p>
      </blockquote>
      <figcaption className="border-hairline mt-6 border-t pt-5">
        <span className="text-ink block text-sm font-medium">
          Verified client feedback from Abdullah Al Masum
        </span>
        <span className="text-ink-muted mt-1 block text-sm">
          {testimonial.context}
        </span>
      </figcaption>
    </figure>
  );
}
