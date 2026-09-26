import { COLD_EMAIL_FAMILIAR } from "@/components/cold-email/cold-email-copy";
import { Section } from "@/components/public/section";
import { SectionHeading } from "@/components/public/section-heading";

/**
 * The problems a visitor recognizes, straight under the hero. Same card
 * styling as the audience cards it replaced; a small orange dot instead of
 * a check icon, since these describe problems rather than benefits.
 */
export function ColdEmailFamiliarSection() {
  return (
    <Section tone="canvasAlt" labelledBy="cold-email-familiar-heading">
      <div id="cold-email-familiar-heading">
        <SectionHeading title={COLD_EMAIL_FAMILIAR.heading} />
      </div>

      <ul className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
        {COLD_EMAIL_FAMILIAR.cards.map((card) => (
          <li key={card.title} className="border-hairline bg-surface border p-6 md:p-7" data-reveal>
            <h3 className="text-ink flex items-start gap-3 text-base font-semibold md:text-lg">
              <span aria-hidden="true" className="bg-action mt-2 size-2 shrink-0 rounded-full" />
              {card.title}
            </h3>
            <p className="text-ink-muted mt-3 pl-5 text-sm leading-relaxed md:text-base">{card.body}</p>
          </li>
        ))}
      </ul>

      <p className="text-ink-muted mx-auto mt-10 max-w-2xl text-center text-sm md:text-base" data-reveal>
        {COLD_EMAIL_FAMILIAR.closing}
      </p>
    </Section>
  );
}
