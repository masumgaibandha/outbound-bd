import { HOME_WHY_FAILS } from "@/components/public/home-copy";
import { Section } from "@/components/public/section";
import { SectionHeading } from "@/components/public/section-heading";

/**
 * Homepage version of the /cold-email "Why most cold email fails" section:
 * six short items in a light grid instead of the sales page's large
 * numbered rows, so it reads as context rather than a pitch.
 */
export function HomeWhyFailsSection() {
  return (
    <Section id="why-cold-email-fails" tone="canvas" labelledBy="why-fails-heading" compact>
      {/* Subtext sits outside the labelled wrapper, so the section's
          accessible name is the heading alone. */}
      <div id="why-fails-heading">
        <SectionHeading eyebrow={HOME_WHY_FAILS.eyebrow} title={HOME_WHY_FAILS.heading} />
      </div>
      <p className="text-ink-muted mx-auto mt-6 max-w-prose text-center text-base leading-relaxed text-pretty md:text-lg">
        {HOME_WHY_FAILS.subtext}
      </p>

      <ul className="mt-14 grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {HOME_WHY_FAILS.items.map((item) => (
          <li key={item.title} className="border-hairline border-t pt-5" data-reveal>
            <h3 className="text-ink font-semibold">{item.title}</h3>
            <p className="text-ink-muted mt-2 text-sm leading-relaxed">{item.body}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
