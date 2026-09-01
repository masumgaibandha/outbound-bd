import Image from "next/image";
import Link from "next/link";

import founderPortrait from "@/assets/founder/abdullah-al-masum-portrait.webp";
import { ButtonLink } from "@/components/public/button";
import { Container } from "@/components/public/container";
import { founderStats } from "@/components/public/founder-stats";
import {
  REQUEST_PROPOSAL_HREF,
  STRATEGY_CALL_HREF,
  STRATEGY_CALL_LABEL,
  STRATEGY_CALL_LINK_PROPS,
} from "@/components/public/site-config";
import { UpworkProofLink } from "@/components/public/upwork-proof-link";

/**
 * Ported structurally from masumdev.com's own Hero (warm radial wash,
 * copy/portrait grid, trust-indicator strip below) — adapted to Outbound
 * BD's outreach-only positioning, agency copy, and the founder's real,
 * verified Upwork figures rather than reused as-is.
 */
export function HeroSection() {
  return (
    <section className="relative">
      <div
        aria-hidden="true"
        className="hero-wash pointer-events-none absolute inset-0 -z-10"
      />

      <Container className="pt-14 pb-20 md:pt-16 md:pb-24 lg:pt-20 lg:pb-24">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <div>
            <p className="text-ink-muted text-xs font-semibold tracking-[0.18em] uppercase">
              B2B Cold Email &amp; Lead Generation
            </p>

            <h1 className="type-display text-ink mt-5 text-balance">
              Predictable, qualified conversations
              <span className="font-heading block font-normal italic">
                without the guesswork of cold email.
              </span>
            </h1>

            <p className="text-ink-muted mt-6 max-w-prose text-base leading-relaxed lg:text-[1.0625rem]">
              Outbound BD plans, writes, and runs cold email programs for B2B
              teams who need a reliable stream of sales conversations — not a
              list of unopened sends. Strategy, infrastructure, and copy,
              managed end to end by a senior operator.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <ButtonLink
                href={STRATEGY_CALL_HREF}
                tone="action"
                size="lg"
                {...STRATEGY_CALL_LINK_PROPS}
              >
                {STRATEGY_CALL_LABEL}
              </ButtonLink>
              <ButtonLink href={REQUEST_PROPOSAL_HREF} tone="outline" size="lg">
                Request a Proposal
              </ButtonLink>
            </div>

            <p className="text-ink-muted mt-6 text-sm">
              No purchased lists. No spray-and-pray. Every send is targeted,
              reviewed, and accountable to a real pipeline number.
            </p>
          </div>

          <div className="relative">
            <div className="border-hairline bg-surface relative aspect-[4/5] overflow-hidden rounded-[2rem] border sm:aspect-square lg:aspect-[4/5]">
              <Image
                src={founderPortrait}
                alt="Abdullah Al Masum, founder of Outbound BD"
                unoptimized
                priority
                sizes="(min-width: 1024px) 45vw, (min-width: 640px) 90vw, 100vw"
                className="size-full object-cover object-[center_20%]"
              />
            </div>

            <p className="border-hairline bg-canvas absolute bottom-5 left-5 inline-flex items-center gap-2.5 rounded-full border py-2.5 pr-5 pl-4 text-xs font-semibold tracking-wide text-ink uppercase shadow-[0_2px_8px_-4px_rgb(26_24_21/0.15)] sm:text-sm">
              <span
                aria-hidden="true"
                className="bg-action size-2 shrink-0 rounded-full"
              />
              Upwork Top Rated
            </p>
          </div>
        </div>

        <dl
          className="border-hairline mt-16 grid grid-cols-3 gap-x-8 gap-y-10 border-t pt-10 md:mt-20"
          data-reveal
        >
          {founderStats.map((stat) => (
            <div key={stat.label}>
              <dt className="font-heading text-ink block text-3xl tracking-tight md:text-4xl">
                {stat.value}
              </dt>
              <dd className="text-ink-muted mt-2 block text-sm">
                {stat.label}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-5">
          <UpworkProofLink />
        </div>

        <p className="text-ink-muted mt-6 text-sm">
          Run by the founder himself, Abdullah Al Masum —{" "}
          <Link
            href="/about/founder"
            className="text-ink decoration-action hover:text-action focus-visible:outline-action rounded-sm font-medium underline decoration-2 underline-offset-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            more about the founder
          </Link>
          .
        </p>
      </Container>
    </section>
  );
}
