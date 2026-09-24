import Image from "next/image";

import founderPortrait from "@/assets/founder/abdullah-al-masum-portrait.webp";
import { HERO_ID } from "@/components/agencies/agency-anchors";
import { AgencyBookACallButton } from "@/components/agencies/agency-book-a-call-button";
import { AgencyScrollToFormLink } from "@/components/agencies/agency-scroll-to-form-link";
import { Container } from "@/components/public/container";
import { founderStats } from "@/components/public/founder-stats";
import { CheckIcon } from "@/components/public/icons";

function statValue(label: string): string {
  return founderStats.find((stat) => stat.label === label)?.value ?? "";
}

const HERO_POINTS = [
  "Month-to-month, no long contract",
  "Your brand on every report",
  "Live in about 3 weeks",
] as const;

/**
 * Copy is fixed, exact wording from the round's own instructions, so do not
 * reword it here. Numbers in the trust line come from founder-stats.ts,
 * never restated as a literal here (see that file's own "single source of
 * truth" doc comment). Portrait pattern mirrors the homepage `HeroSection`.
 */
export function AgencyHeroSection() {
  const jobs = statValue("Upwork jobs");
  const hours = statValue("Upwork hours");
  const years = statValue("Years of outreach experience");

  return (
    <section id={HERO_ID} className="relative">
      <div
        aria-hidden="true"
        className="hero-wash pointer-events-none absolute inset-0 -z-10"
      />

      <Container className="pt-12 pb-16 md:pt-16 md:pb-20 lg:pt-20 lg:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          <div>
            <p className="text-ink-muted text-xs font-semibold tracking-[0.18em] uppercase">
              White-label cold email for agencies
            </p>

            <h1 className="type-display text-ink mt-5 text-balance">
              Sell cold email to your clients. I&apos;ll run it under your brand.
            </h1>

            <p className="text-ink-muted mt-6 max-w-prose text-base leading-relaxed lg:text-[1.0625rem]">
              Your clients already ask for more leads. I handle the domains,
              inboxes, lead lists, copy and campaigns. You keep the client and
              the margin.
            </p>

            <ul className="mt-7 space-y-2.5">
              {HERO_POINTS.map((point) => (
                <li key={point} className="text-ink flex items-center gap-2.5 text-sm font-medium md:text-base">
                  <CheckIcon width={18} height={18} aria-hidden="true" className="text-action shrink-0" />
                  {point}
                </li>
              ))}
            </ul>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <AgencyScrollToFormLink>Get the details</AgencyScrollToFormLink>
              <AgencyBookACallButton />
            </div>

            <p className="text-ink-muted mt-6 text-sm">
              Top Rated on Upwork · {jobs} jobs · {hours} hours · {years} years
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="border-hairline bg-surface relative aspect-[4/5] overflow-hidden rounded-[2rem] border">
              <Image
                src={founderPortrait}
                alt="Abdullah Al Masum, founder of Outbound BD"
                unoptimized
                priority
                sizes="(min-width: 1024px) 40vw, (min-width: 640px) 28rem, 100vw"
                className="size-full object-cover object-[center_20%]"
              />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
