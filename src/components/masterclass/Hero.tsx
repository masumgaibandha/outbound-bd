import Image from "next/image";

import { Container } from "@/components/public/container";
import { ArrowDownIcon, ArrowRightIcon } from "@/components/public/icons";
import { numericTextClass } from "@/components/masterclass/MasterclassSection";
import { hero, offerDetails } from "@/data/masterclass-content";
import { formatBDT } from "@/lib/masterclass/format";
import portrait from "@/assets/founder/abdullah-al-masum-portrait.webp";

interface HeroProps {
  priceBDT: number;
}

/**
 * The page's only `<h1>`. No countdown, no scarcity messaging — the offer
 * details are plain logistics (dates/time/format), not urgency devices.
 * Ported from the MasumDev masterclass source; reuses this repo's own
 * founder portrait asset instead of duplicating a new one.
 */
export function Hero({ priceBDT }: HeroProps) {
  return (
    <section aria-labelledby="masterclass-hero-heading" className="relative">
      <div
        aria-hidden="true"
        className="hero-wash pointer-events-none absolute inset-0 -z-10"
      />

      <Container className="pt-10 pb-14 md:pt-14 md:pb-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:gap-12">
          <div>
            <p className="text-ink-muted font-bengali text-sm font-medium tracking-[0.04em]">
              {hero.eyebrow}
            </p>

            <h1
              id="masterclass-hero-heading"
              className="font-bengali text-ink mt-4 text-[clamp(2.15rem,3.6vw,3.375rem)] leading-[1.15] tracking-[-0.01em] text-balance"
            >
              {hero.headline}
            </h1>

            <p className="text-ink-muted mt-6 max-w-prose text-base leading-relaxed md:text-lg">
              {hero.description}
            </p>

            <p className="text-ink border-hairline bg-surface mt-6 inline-block rounded-full border px-4 py-2 text-xs font-medium md:text-sm">
              {hero.credibilityLine}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#registration"
                className="bg-action hover:bg-action-hover focus-visible:outline-action inline-flex h-13 items-center gap-2 rounded-full px-7 text-[0.95rem] font-medium text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {hero.primaryCtaLabel} — <span className={numericTextClass}>{formatBDT(priceBDT)}</span>
                <ArrowRightIcon className="size-4" aria-hidden="true" />
              </a>
              <a
                href="#curriculum-day-1"
                className="border-hairline text-ink hover:border-action hover:text-action focus-visible:outline-action inline-flex h-13 items-center gap-2 rounded-full border px-7 text-[0.95rem] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {hero.secondaryCta}
                <ArrowDownIcon className="size-4" aria-hidden="true" />
              </a>
            </div>

            <ul className="border-hairline mt-8 grid grid-cols-2 gap-x-6 gap-y-3 border-t pt-6 sm:grid-cols-4">
              {offerDetails.map((detail) => (
                <li
                  key={detail.label}
                  className="text-ink-muted text-xs leading-snug md:text-sm"
                >
                  {detail.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="border-hairline bg-canvas-alt relative aspect-[4/5] overflow-hidden rounded-2xl border sm:aspect-square lg:aspect-[4/5]">
            <Image
              src={portrait}
              alt={hero.instructorImageAlt}
              priority
              fetchPriority="high"
              sizes="(min-width: 1024px) 40vw, (min-width: 640px) 85vw, 100vw"
              className="size-full object-cover object-[center_20%]"
            />
          </div>
        </div>
      </Container>
    </section>
  );
}
