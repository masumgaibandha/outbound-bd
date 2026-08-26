import Link from "next/link";
import { buttonVariants } from "@heroui/styles";

import { STRATEGY_CALL_HREF } from "@/components/public/site-config";

type FinalCtaSectionProps = {
  heading?: string;
  description?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export function FinalCtaSection({
  heading = "Ready for pipeline that doesn't depend on inbound?",
  description = "Tell us about your ICP and goals on a 30-minute call. We'll tell you honestly whether cold email is the right channel for you.",
  secondaryHref = "/#results",
  secondaryLabel = "See results",
}: FinalCtaSectionProps) {
  return (
    <section className="bg-navy py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight text-balance text-canvas sm:text-4xl">
          {heading}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-pretty text-azure">
          {description}
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={STRATEGY_CALL_HREF}
            className={`${buttonVariants({ variant: "primary", size: "lg" })} w-full rounded-lg sm:w-auto`}
          >
            Book a Strategy Call
          </Link>
          <Link
            href={secondaryHref}
            className="w-full rounded-lg border border-azure/40 px-6 py-3 text-center text-base font-medium text-canvas transition-colors hover:bg-white/5 sm:w-auto"
          >
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
