import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/public/icons";
import { FinalCtaSection } from "@/components/public/final-cta-section";
import { SectionHeading } from "@/components/public/section-heading";
import { SERVICES } from "@/components/public/services-data";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Cold email outreach, lead generation, email infrastructure, and email deliverability — managed end to end for B2B revenue teams.",
};

export default function ServicesIndexPage() {
  return (
    <>
      <section className="border-b border-hairline">
        <div className="mx-auto max-w-4xl px-4 pt-16 pb-16 text-center sm:px-6 sm:pt-20 sm:pb-20">
          <p className="text-xs font-semibold tracking-[0.14em] text-royal uppercase">
            Services
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance text-ink sm:text-4xl lg:text-5xl">
            Everything cold email needs to work, run as one program
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-pretty text-subtext">
            Targeting, infrastructure, copy, and deliverability are usually
            split across separate vendors or tools. We run them together, so
            nothing falls through the cracks between strategy and send.
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="Our services"
            title="Four disciplines, one team"
            align="left"
          />

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {SERVICES.map((service) => (
              <Link
                key={service.slug}
                href={`/services/${service.slug}`}
                className="group flex flex-col rounded-xl border border-hairline p-8 transition-colors hover:border-royal/40"
              >
                <h2 className="text-xl font-semibold text-ink">
                  {service.navLabel}
                </h2>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-subtext">
                  {service.shortDescription}
                </p>
                <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-royal">
                  Learn more
                  <ArrowRightIcon
                    width={16}
                    height={16}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <FinalCtaSection />
    </>
  );
}
