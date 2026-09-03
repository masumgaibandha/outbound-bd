import Image from "next/image";

import {
  MasterclassSection,
  eyebrowClass,
  eyebrowDotClass,
} from "@/components/masterclass/MasterclassSection";
import { MasterclassEvidenceGallery } from "@/components/masterclass/MasterclassEvidenceGallery";
import { resultsProof } from "@/data/masterclass-content";

/**
 * Ported from the MasumDev masterclass source; the asset set was updated for
 * the Outbound BD evidence migration, and the 5 evidence items now render
 * through `MasterclassEvidenceGallery` (a responsive grid with
 * click-to-enlarge). `resultsProof.clientFeedback` (the Upwork review
 * screenshot) is rendered here directly, unchanged from before this
 * migration — it deliberately does not get the gallery/lightbox treatment.
 */
export function ResultsProof() {
  const { clientFeedback } = resultsProof;
  const clientFeedbackHref =
    typeof clientFeedback.src === "string" ? clientFeedback.src : clientFeedback.src.src;

  return (
    <MasterclassSection id="results" tone="canvasAlt" labelledBy="results-heading">
      <p className={eyebrowClass}>
        <span aria-hidden="true" className={eyebrowDotClass} />
        {resultsProof.label}
      </p>
      <h2
        id="results-heading"
        className="type-section font-bengali text-ink mt-4 max-w-2xl text-balance"
      >
        {resultsProof.heading}
      </h2>

      <MasterclassEvidenceGallery assets={resultsProof.assets} enlargeHintLabel={resultsProof.enlargeHintLabel} />

      <ul className="mt-6 grid gap-6">
        <li>
          <figure className="border-hairline bg-surface flex h-full flex-col border p-5">
            <div className="bg-canvas-alt relative h-72 overflow-hidden rounded-sm sm:h-96">
              <Image
                src={clientFeedback.src}
                alt={clientFeedback.alt}
                fill
                unoptimized
                sizes="(min-width: 768px) 900px, 100vw"
                className="object-contain"
              />
            </div>
            <figcaption className="text-ink-muted font-bengali mt-4 text-sm leading-relaxed">
              {clientFeedback.caption}
            </figcaption>
            <a
              href={clientFeedbackHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink hover:text-action focus-visible:outline-action decoration-action font-bengali mt-3 inline-flex min-h-11 w-fit items-center rounded-sm text-sm font-medium underline decoration-2 underline-offset-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              {resultsProof.viewFullSizeLabel}
              <span className="sr-only"> (নতুন ট্যাবে খুলবে)</span>
            </a>
          </figure>
        </li>
      </ul>
    </MasterclassSection>
  );
}
