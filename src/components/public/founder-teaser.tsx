import Link from "next/link";

import { ArrowRightIcon } from "@/components/public/icons";

export function FounderTeaser() {
  return (
    <section className="border-t border-hairline py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 rounded-xl border border-hairline p-8 sm:flex-row sm:items-center sm:p-10">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-royal uppercase">
              Founder
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
              Meet Abdullah Al Masum
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-subtext">
              10+ years in B2B lead generation and cold email outreach,
              Upwork Top Rated, based in Bangladesh and serving clients
              worldwide.
            </p>
          </div>
          <Link
            href="/about/founder"
            className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-royal transition-colors hover:text-navy"
          >
            About the founder
            <ArrowRightIcon
              width={16}
              height={16}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
