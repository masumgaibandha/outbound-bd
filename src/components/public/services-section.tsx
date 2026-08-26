import Link from "next/link";

import {
  InboxIcon,
  PenLineIcon,
  ShieldIcon,
  TargetIcon,
} from "@/components/public/icons";
import { SectionHeading } from "@/components/public/section-heading";

const SERVICES = [
  {
    icon: TargetIcon,
    title: "Targeting & list building",
    description:
      "We define your ideal-customer profile, then research and verify a prospect list matched to it — no purchased or recycled data.",
  },
  {
    icon: ShieldIcon,
    title: "Deliverability & infrastructure",
    description:
      "Dedicated sending domains, staged warm-up, and inbox rotation, monitored continuously so your sequences land in the primary inbox.",
  },
  {
    icon: PenLineIcon,
    title: "Copywriting & sequence strategy",
    description:
      "Multi-step sequences written by senior strategists, grounded in your positioning and tested against real reply data.",
  },
  {
    icon: InboxIcon,
    title: "Reply handling & meeting booking",
    description:
      "Every reply is triaged by a human. Qualified conversations are booked directly onto your calendar, ready for your team.",
  },
] as const;

export function ServicesSection() {
  return (
    <section id="services" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Core services"
          title="Everything cold email needs to work, in one program"
          description="Four disciplines, run together by one team, so nothing falls through the cracks between strategy and send."
        />

        <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="bg-canvas p-8">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-navy/[0.06] text-navy">
                <Icon />
              </div>
              <h3 className="mt-5 text-base font-semibold text-ink">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-subtext">
                {description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/services"
            className="text-sm font-medium text-royal transition-colors hover:text-navy"
          >
            View all services &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
