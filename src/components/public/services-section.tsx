import Link from "next/link";

import { ArrowRightIcon, CheckIcon } from "@/components/public/icons";
import { SectionHeading } from "@/components/public/section-heading";
import { Section } from "@/components/public/section";
import { SERVICES } from "@/components/public/services-data";

export function ServicesSection() {
  return (
    <Section id="services" tone="canvasAlt" labelledBy="services-heading">
      <SectionHeading
        eyebrow="Core services"
        title="Everything cold email needs to work, in one program"
        description="Four disciplines, run together by one team, so nothing falls through the cracks between strategy and send."
      />

      <ul className="mt-16 grid gap-6 md:grid-cols-2">
        {SERVICES.map((service, index) => (
          <li key={service.slug} data-reveal>
            <Link
              href={`/services/${service.slug}`}
              className="card-interactive border-hairline bg-surface group flex h-full flex-col border p-8 md:p-9"
            >
              <span
                className="text-ink-muted font-heading block text-sm"
                aria-hidden="true"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="font-heading text-ink mt-3 text-2xl tracking-tight">
                {service.navLabel}
              </h3>
              <p className="text-ink-muted mt-4 leading-relaxed">
                {service.shortDescription}
              </p>

              <ul className="mt-6 flex-1 space-y-2.5">
                {service.deliverables.slice(0, 4).map((item) => (
                  <li
                    key={item.title}
                    className="flex items-start gap-2.5 text-sm"
                  >
                    <CheckIcon
                      width={16}
                      height={16}
                      className="text-action mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-ink">{item.title}</span>
                  </li>
                ))}
              </ul>

              <span className="text-action group-hover:text-action-hover mt-7 inline-flex items-center gap-2 text-sm font-medium">
                Learn more
                <ArrowRightIcon
                  width={16}
                  height={16}
                  className="transition-transform duration-200 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-10 text-center">
        <Link
          href="/services"
          className="text-ink decoration-action hover:text-action focus-visible:outline-action rounded-sm text-sm font-medium underline decoration-2 underline-offset-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          View all services →
        </Link>
      </div>
    </Section>
  );
}
