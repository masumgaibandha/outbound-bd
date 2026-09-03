import {
  MasterclassSection,
  eyebrowClass,
  eyebrowDotClass,
} from "@/components/masterclass/MasterclassSection";
import { expectationStory } from "@/data/masterclass-content";

/** Sets honest expectations up front — no income/client guarantee, practice required. Ported from the MasumDev masterclass source. */
export function ExpectationStory() {
  return (
    <MasterclassSection id="expectation" labelledBy="expectation-heading">
      <div className="max-w-3xl">
        <p className={eyebrowClass}>
          <span aria-hidden="true" className={eyebrowDotClass} />
          {expectationStory.label}
        </p>
        <h2
          id="expectation-heading"
          className="type-section font-bengali text-ink mt-4 text-balance"
        >
          {expectationStory.heading}
        </h2>
        <div className="mt-6 space-y-4">
          {expectationStory.paragraphs.map((paragraph) => (
            <p
              key={paragraph.slice(0, 24)}
              className="text-ink-muted leading-relaxed md:text-lg"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </MasterclassSection>
  );
}
