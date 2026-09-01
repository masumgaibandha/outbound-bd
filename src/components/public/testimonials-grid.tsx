import { TestimonialCard } from "@/components/public/testimonial-card";
import type { Testimonial } from "@/components/public/testimonials-data";

type TestimonialsGridProps = {
  items: readonly Testimonial[];
};

/**
 * Shared by the homepage preview, /testimonials, and /results — one grid
 * implementation so the three surfaces can't drift apart. Two columns max
 * (never three: quotes need width to read comfortably). Deliberately no
 * `items-start` and no `auto-rows-fr`: Grid's default `align-items: stretch`
 * already equalizes height only within each row (not across the whole
 * grid), which is exactly "pair-matched" height without the auto-rows-fr
 * trap of forcing every card to the single longest review anywhere in the
 * list. TestimonialCard opts into filling that stretched height at md+.
 */
export function TestimonialsGrid({ items }: TestimonialsGridProps) {
  return (
    <ul className="grid gap-6 md:grid-cols-2">
      {items.map((testimonial) => (
        <li key={testimonial.id} data-reveal>
          <TestimonialCard testimonial={testimonial} />
        </li>
      ))}
    </ul>
  );
}
