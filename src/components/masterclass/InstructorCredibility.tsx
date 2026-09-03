import Image from "next/image";

import {
  MasterclassSection,
  eyebrowClass,
  eyebrowDotClass,
} from "@/components/masterclass/MasterclassSection";
import { instructor, resultsProof } from "@/data/masterclass-content";
import portrait from "@/assets/founder/abdullah-al-masum-portrait.webp";

/** Ported from the MasumDev masterclass source; reuses this repo's own founder portrait asset instead of duplicating a new one. */
export function InstructorCredibility() {
  return (
    <MasterclassSection id="instructor" labelledBy="instructor-heading">
      <p className={eyebrowClass}>
        <span aria-hidden="true" className={eyebrowDotClass} />
        {instructor.label}
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
        <div>
          <div className="border-hairline bg-canvas relative aspect-square overflow-hidden rounded-2xl border">
            <Image
              src={portrait}
              alt={instructor.portraitAlt}
              sizes="(min-width: 1024px) 32vw, (min-width: 640px) 60vw, 100vw"
              className="size-full object-cover object-[center_20%]"
            />
          </div>
          <h2
            id="instructor-heading"
            className="font-heading text-ink mt-5 text-2xl tracking-tight"
          >
            {instructor.heading}
          </h2>
          <p className="text-ink-muted font-bengali mt-1 text-sm">
            {instructor.role}
          </p>
        </div>

        <div>
          <div className="space-y-4">
            {instructor.paragraphs.map((paragraph) => (
              <p
                key={paragraph.slice(0, 24)}
                className="text-ink-muted leading-relaxed md:text-lg"
              >
                {paragraph}
              </p>
            ))}
          </div>

          <figure className="border-hairline bg-surface mt-8 border p-5">
            <div className="bg-canvas-alt overflow-hidden rounded-sm">
              <Image
                src={instructor.proof.src}
                alt={instructor.proof.alt}
                width={instructor.proof.width}
                height={instructor.proof.height}
                sizes="(min-width: 768px) 700px, 100vw"
                className="h-auto w-full"
              />
            </div>
            <figcaption className="text-ink-muted font-bengali mt-4 text-sm leading-relaxed">
              {instructor.proof.caption}
            </figcaption>
            <a
              href={instructor.proof.src}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink hover:text-action focus-visible:outline-action decoration-action font-bengali mt-3 inline-flex min-h-11 w-fit items-center rounded-sm text-sm font-medium underline decoration-2 underline-offset-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              {resultsProof.viewFullSizeLabel}
              <span className="sr-only"> (নতুন ট্যাবে খুলবে)</span>
            </a>
          </figure>

          {/* Secondary, verifiable — not the primary registration CTA, so an outline style. */}
          <div className="mt-4 flex flex-wrap gap-3">
            {instructor.profileLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="border-hairline text-ink hover:border-action hover:text-action focus-visible:outline-action font-bengali inline-flex min-h-11 items-center justify-center rounded-full border px-5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {link.label}
                <span className="sr-only"> (নতুন ট্যাবে খুলবে)</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </MasterclassSection>
  );
}
