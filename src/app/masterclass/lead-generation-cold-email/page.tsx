import { AudienceFit } from "@/components/masterclass/AudienceFit";
import { CurriculumDaySection } from "@/components/masterclass/CurriculumDaySection";
import { ExpectationStory } from "@/components/masterclass/ExpectationStory";
import { Faq } from "@/components/masterclass/Faq";
import { FinalCta } from "@/components/masterclass/FinalCta";
import { Hero } from "@/components/masterclass/Hero";
import { InstructorCredibility } from "@/components/masterclass/InstructorCredibility";
import { MarketingConsentBanner } from "@/components/masterclass/MarketingConsentBanner";
import { MasterclassFooter } from "@/components/masterclass/MasterclassFooter";
import { MasterclassHeader } from "@/components/masterclass/MasterclassHeader";
import { MetaPixelGate } from "@/components/masterclass/MetaPixelGate";
import { Outcomes } from "@/components/masterclass/Outcomes";
import { Registration } from "@/components/masterclass/Registration";
import { ResultsProof } from "@/components/masterclass/ResultsProof";
import { StickyMobileCta } from "@/components/masterclass/StickyMobileCta";
import { TrustMetrics } from "@/components/masterclass/TrustMetrics";
import { Workflow } from "@/components/masterclass/Workflow";
import { curriculumDays, curriculumNote, masterclassMeta } from "@/data/masterclass-content";
import {
  currency,
  earlyBirdPriceBDT,
  regularPriceBDT,
  resolvePriceBDT,
} from "@/lib/masterclass/constants";

/*
 * This page has no dynamic request data (no cookies/headers/searchParams
 * read), so Next.js would otherwise fully prerender it once at build time.
 * The 5-minute ISR window below only fixes the *time-based* part of that:
 * `resolvePriceBDT()` reads a genuine `new Date()` at each regeneration, so
 * once a real `earlyBirdEndsAt` is set, the price still flips within ~5
 * minutes of the deadline rather than only on the next deploy.
 *
 * It does NOT fix env-var staleness. `MASTERCLASS_REGISTRATION_ENABLED`,
 * the manual payment numbers, and every other server-only env var read on
 * this page are snapshotted into a Vercel deployment at build time — ISR
 * regenerates this page *within that same deployment*, so a changed env var
 * only takes effect after an actual redeploy. Ported from the MasumDev
 * masterclass source.
 */
export const revalidate = 300;

export default function MasterclassSalesPage() {
  const [dayOne, dayTwo] = curriculumDays;
  /* Computed once per render, passed down — every price on this page traces back to this single call. */
  const priceBDT = resolvePriceBDT();
  const isEarlyBird = priceBDT === earlyBirdPriceBDT;
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  return (
    <>
      {pixelId ? (
        <MetaPixelGate
          pixelId={pixelId}
          contentName={masterclassMeta.seoTitle}
          currency={currency}
          value={priceBDT}
        />
      ) : null}

      <a
        href="#main"
        className="focus:bg-ink focus:text-on-dark sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-100 focus:rounded-full focus:px-5 focus:py-3 focus:text-sm focus:font-medium"
      >
        মূল কনটেন্টে যান
      </a>

      <MasterclassHeader />

      {/* Bottom padding reserves room for the fixed mobile CTA bar below `md`. */}
      <main id="main" className="pb-24 md:pb-0">
        <Hero priceBDT={priceBDT} />
        <TrustMetrics />
        <ExpectationStory />
        <Outcomes />
        <CurriculumDaySection day={dayOne} tone="canvas" />
        <CurriculumDaySection day={dayTwo} tone="canvasAlt" note={curriculumNote} />
        <Workflow />
        <ResultsProof />
        <InstructorCredibility />
        <AudienceFit />
        <Registration priceBDT={priceBDT} isEarlyBird={isEarlyBird} regularPriceBDT={regularPriceBDT} />
        <Faq />
      </main>

      <FinalCta priceBDT={priceBDT} />
      <MasterclassFooter />
      <StickyMobileCta priceBDT={priceBDT} />
      {pixelId ? <MarketingConsentBanner /> : null}
    </>
  );
}
