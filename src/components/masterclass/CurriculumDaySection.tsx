import { InfoIcon } from "@/components/public/icons";
import {
  MasterclassSection,
  type MasterclassSectionTone,
} from "@/components/masterclass/MasterclassSection";
import type { CurriculumDay } from "@/types/masterclass";

interface CurriculumDaySectionProps {
  day: CurriculumDay;
  tone?: MasterclassSectionTone;
  /** Shown only under Day 2 — the "foundation, not mastery" note. */
  note?: string;
}

/** Ported from the MasumDev masterclass source. */
export function CurriculumDaySection({
  day,
  tone = "canvas",
  note,
}: CurriculumDaySectionProps) {
  const headingId = `${day.id}-heading`;

  return (
    <MasterclassSection id={day.id} tone={tone} labelledBy={headingId}>
      <p className="text-action text-xs font-semibold tracking-[0.14em] uppercase">
        {day.dayLabel}
      </p>
      <h2
        id={headingId}
        className="type-section font-bengali text-ink mt-4 max-w-3xl text-balance"
      >
        {day.heading}
      </h2>

      <ol className="mt-8 grid gap-3 sm:grid-cols-2">
        {day.items.map((item, index) => (
          <li
            key={item}
            className="border-hairline bg-surface flex items-start gap-4 border p-5"
          >
            <span
              aria-hidden="true"
              className="bg-ink text-on-dark flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
            >
              {index + 1}
            </span>
            <span className="text-ink text-sm leading-relaxed md:text-base">
              {item}
            </span>
          </li>
        ))}
      </ol>

      {note ? (
        <p className="border-hairline bg-canvas text-ink-muted mt-8 flex items-start gap-3 border p-5 text-sm leading-relaxed">
          <InfoIcon className="text-action mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{note}</span>
        </p>
      ) : null}
    </MasterclassSection>
  );
}
