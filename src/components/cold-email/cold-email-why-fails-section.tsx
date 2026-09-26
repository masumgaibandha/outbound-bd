import { COLD_EMAIL_WHY_FAILS } from "@/components/cold-email/cold-email-copy";
import { Section } from "@/components/public/section";
import { SectionHeading } from "@/components/public/section-heading";

/**
 * Sits between the gold proof band and the cream form, on canvas-alt so it
 * reads as its own section against both neighbours.
 */
export function ColdEmailWhyFailsSection() {
  return (
    <Section tone="canvasAlt" labelledBy="cold-email-why-fails-heading">
      {/* Subtext sits outside the labelled wrapper, so the section's
          accessible name is the heading alone. */}
      <div id="cold-email-why-fails-heading">
        <SectionHeading title={COLD_EMAIL_WHY_FAILS.heading} />
      </div>
      <p className="text-ink-muted mx-auto mt-5 max-w-prose text-center text-base leading-relaxed text-pretty md:text-lg">
        {COLD_EMAIL_WHY_FAILS.subtext}
      </p>

      <ol className="divide-hairline border-hairline mx-auto mt-12 max-w-3xl divide-y border-y">
        {COLD_EMAIL_WHY_FAILS.blocks.map((block, index) => (
          <li key={block.title} className="flex gap-5 py-8 md:gap-8 md:py-10" data-reveal>
            <span
              aria-hidden="true"
              className="text-action font-heading w-10 shrink-0 text-3xl leading-none tabular-nums md:w-12 md:text-4xl"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h3 className="text-ink text-lg font-semibold md:text-xl">{block.title}</h3>
              <p className="text-ink-muted mt-3 text-sm leading-relaxed md:text-base">{block.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="text-ink-muted mx-auto mt-10 max-w-2xl text-center text-sm md:text-base" data-reveal>
        {COLD_EMAIL_WHY_FAILS.closing}
      </p>
    </Section>
  );
}
