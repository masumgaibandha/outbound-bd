import Link from "next/link";
import { buttonVariants } from "@heroui/styles";

import { STRATEGY_CALL_HREF } from "@/components/public/site-config";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <BrandMotif />

      <div className="relative mx-auto max-w-4xl px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-28 sm:pb-20 lg:pt-32 lg:pb-24">
        <p className="text-xs font-semibold tracking-[0.14em] text-royal uppercase">
          B2B Cold Email &amp; Lead Generation
        </p>

        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-balance text-ink sm:text-5xl lg:text-6xl">
          Predictable, qualified conversations — without the guesswork of
          cold email.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-subtext">
          Outbound BD plans, writes, and runs cold email programs for B2B
          teams who need a reliable stream of sales conversations, not a
          list of unopened sends. Strategy, infrastructure, and copy —
          managed end to end by senior operators.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={STRATEGY_CALL_HREF}
            className={`${buttonVariants({ variant: "primary", size: "lg" })} w-full rounded-lg sm:w-auto`}
          >
            Book a Strategy Call
          </Link>
          <Link
            href="/#process"
            className={`${buttonVariants({ variant: "outline", size: "lg" })} w-full rounded-lg sm:w-auto`}
          >
            See how it works
          </Link>
        </div>

        <p className="mt-8 text-sm text-subtext">
          No purchased lists. No spray-and-pray. Every send is targeted,
          reviewed, and accountable to a real pipeline number.
        </p>
      </div>
    </section>
  );
}

/**
 * Restrained geometric echo of the brand mark — pure CSS/SVG, not a stock
 * illustration. Purely decorative, so it's hidden from assistive tech.
 */
function BrandMotif() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute top-0 right-0 -z-10 h-56 w-56 -translate-y-1/4 translate-x-1/4 opacity-[0.05] sm:h-96 sm:w-96 sm:opacity-[0.07] lg:h-[32rem] lg:w-[32rem] lg:opacity-[0.08]"
      viewBox="0 0 400 400"
      fill="none"
    >
      <circle cx="200" cy="200" r="140" stroke="#082B6E" strokeWidth="26" />
      <circle cx="322" cy="88" r="20" fill="#1D5BE0" />
    </svg>
  );
}
