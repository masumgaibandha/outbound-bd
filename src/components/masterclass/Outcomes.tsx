import { CheckIcon } from "@/components/public/icons";
import {
  MasterclassSection,
  eyebrowClass,
  eyebrowDotClass,
} from "@/components/masterclass/MasterclassSection";
import { outcomes } from "@/data/masterclass-content";

/** Ported from the MasumDev masterclass source. */
export function Outcomes() {
  return (
    <MasterclassSection id="outcomes" tone="canvasAlt" labelledBy="outcomes-heading">
      <p className={eyebrowClass}>
        <span aria-hidden="true" className={eyebrowDotClass} />
        {outcomes.label}
      </p>
      <h2
        id="outcomes-heading"
        className="type-section font-bengali text-ink mt-4 max-w-2xl text-balance"
      >
        {outcomes.heading}
      </h2>

      <ul className="mt-8 grid gap-4 md:grid-cols-2">
        {outcomes.items.map((item) => (
          <li
            key={item}
            className="border-hairline bg-surface flex items-start gap-3 border p-5"
          >
            <CheckIcon
              className="text-action mt-0.5 size-5 shrink-0"
              aria-hidden="true"
            />
            <span className="text-ink text-sm leading-relaxed md:text-base">
              {item}
            </span>
          </li>
        ))}
      </ul>
    </MasterclassSection>
  );
}
