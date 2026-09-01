import Link from "next/link";

import { ArrowRightIcon } from "@/components/public/icons";
import { Section } from "@/components/public/section";

export function FounderTeaser() {
  return (
    <Section tone="canvasAlt" compact>
      <div className="border-hairline bg-surface flex flex-col items-start justify-between gap-6 border p-8 sm:flex-row sm:items-center sm:p-10">
        <div>
          <p className="text-ink-muted text-xs font-semibold tracking-[0.18em] uppercase">
            Founder
          </p>
          <h2 className="font-heading text-ink mt-2 text-2xl tracking-tight">
            Meet Abdullah Al Masum
          </h2>
          <p className="text-ink-muted mt-2 max-w-xl text-sm leading-relaxed">
            10+ years in B2B lead generation and cold email outreach, Upwork
            Top Rated, based in Bangladesh and serving clients worldwide.
          </p>
        </div>
        <Link
          href="/about/founder"
          className="text-action hover:text-action-hover focus-visible:outline-action group inline-flex shrink-0 items-center gap-1.5 rounded-sm text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          About the founder
          <ArrowRightIcon
            width={16}
            height={16}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </Section>
  );
}
