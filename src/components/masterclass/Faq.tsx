import { PlusIcon } from "@/components/public/icons";
import {
  MasterclassSection,
  eyebrowClass,
  eyebrowDotClass,
} from "@/components/masterclass/MasterclassSection";
import { faqItems } from "@/data/masterclass-content";

/** Native <details>/<summary> — no Client Component needed for an accordion. Ported from the MasumDev masterclass source. */
export function Faq() {
  return (
    <MasterclassSection id="faq" tone="canvasAlt" labelledBy="faq-heading">
      <p className={eyebrowClass}>
        <span aria-hidden="true" className={eyebrowDotClass} />
        FAQ
      </p>
      <h2
        id="faq-heading"
        className="type-section font-bengali text-ink mt-4 max-w-2xl text-balance"
      >
        সাধারণ প্রশ্নোত্তর
      </h2>

      <div className="border-hairline divide-hairline mt-8 divide-y border-t border-b">
        {faqItems.map((item) => (
          <details key={item.id} className="group py-5">
            <summary className="font-bengali text-ink focus-visible:outline-action flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium marker:content-none focus-visible:outline-2 focus-visible:outline-offset-4 md:text-lg">
              {item.question}
              <PlusIcon
                className="text-action size-5 shrink-0 transition-transform duration-200 group-open:rotate-45"
                aria-hidden="true"
              />
            </summary>
            <p className="text-ink-muted font-bengali mt-4 max-w-prose leading-relaxed">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </MasterclassSection>
  );
}
