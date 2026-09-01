import type { Metadata } from "next";
import Link from "next/link";

import { ArrowRightIcon } from "@/components/public/icons";
import { Container } from "@/components/public/container";
import { FinalCtaSection } from "@/components/public/final-cta-section";
import { SectionHeading } from "@/components/public/section-heading";
import { Section } from "@/components/public/section";
import { SERVICES } from "@/components/public/services-data";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Cold email outreach, lead generation, email infrastructure, and email deliverability — managed end to end for B2B revenue teams.",
};

export default function ServicesIndexPage() {
  return (
    <>
      <section className="hero-wash relative border-b border-hairline">
        <Container className="max-w-4xl pt-16 pb-16 text-center sm:pt-20 sm:pb-20">
          <p className="text-ink-muted text-xs font-semibold tracking-[0.18em] uppercase">
            Services
          </p>
          <h1 className="font-heading text-ink type-section mt-4 text-balance">
            Everything cold email needs to work, run as one program
          </h1>
          <p className="text-ink-muted mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-pretty">
            Targeting, infrastructure, copy, and deliverability are usually
            split across separate vendors or tools. We run them together, so
            nothing falls through the cracks between strategy and send.
          </p>
        </Container>
      </section>

      <Section tone="canvas" labelledBy="services-index-heading">
        <SectionHeading
          eyebrow="Our services"
          title="Four disciplines, one team"
          align="left"
        />

        <ul className="mt-10 grid gap-6 sm:grid-cols-2">
          {SERVICES.map((service, index) => (
            <li key={service.slug} data-reveal>
              <Link
                href={`/services/${service.slug}`}
                className="card-interactive border-hairline bg-surface group flex h-full flex-col border p-8"
              >
                <span className="text-ink-muted font-heading block text-sm" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h2 className="font-heading text-ink mt-3 text-2xl tracking-tight">
                  {service.navLabel}
                </h2>
                <p className="text-ink-muted mt-3 flex-1 leading-relaxed">
                  {service.shortDescription}
                </p>
                <span className="text-action group-hover:text-action-hover mt-6 inline-flex items-center gap-2 text-sm font-medium">
                  Learn more
                  <ArrowRightIcon
                    width={16}
                    height={16}
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <FinalCtaSection />
    </>
  );
}
