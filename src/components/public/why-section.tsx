import {
  ChartIcon,
  GlobeIcon,
  LockIcon,
  ShieldIcon,
  UsersIcon,
} from "@/components/public/icons";
import { SectionHeading } from "@/components/public/section-heading";

const REASONS = [
  {
    icon: ShieldIcon,
    title: "Deliverability-first infrastructure",
    description:
      "Dedicated domains and mailboxes per client, warmed and monitored continuously — your sender reputation is never shared.",
  },
  {
    icon: UsersIcon,
    title: "Senior strategists, not junior VAs",
    description:
      "Every account is run by an experienced outbound operator who understands your market, not a rotating cast of contractors.",
  },
  {
    icon: ChartIcon,
    title: "Transparent, plain-English reporting",
    description:
      "You see every send, reply, and booked meeting in a weekly readout — no vanity metrics, no black-box dashboards.",
  },
  {
    icon: GlobeIcon,
    title: "Global timezone coverage",
    description:
      "We plan send windows and follow-up around your buyers' calendars, whether you're selling into APAC, EMEA, or the Americas.",
  },
  {
    icon: LockIcon,
    title: "Compliance-aware outreach",
    description:
      "Sequences are built with GDPR and CAN-SPAM requirements in mind from the first draft, not bolted on after a complaint.",
  },
] as const;

export function WhySection() {
  return (
    <section className="border-t border-hairline bg-canvas py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Why Outbound BD"
          title="Built to be the outbound partner you don't have to manage"
          align="left"
        />

        <div className="mt-14 grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
          {REASONS.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy/[0.06] text-navy">
                <Icon width={19} height={19} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-ink">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-subtext">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
