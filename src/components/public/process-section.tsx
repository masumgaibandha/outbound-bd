import { SectionHeading } from "@/components/public/section-heading";

const STEPS = [
  {
    number: "01",
    title: "Discover",
    description:
      "We map your ideal-customer profile, offer, and competitive position in a working session with your team.",
  },
  {
    number: "02",
    title: "Build",
    description:
      "We source and verify your prospect list, stand up dedicated sending infrastructure, and write your first sequences.",
  },
  {
    number: "03",
    title: "Launch",
    description:
      "Sequences go live on a warmed, monitored inbox setup. Every send is tracked against deliverability and reply signals.",
  },
  {
    number: "04",
    title: "Optimize",
    description:
      "We test subject lines, angles, and offers against real reply data, and reallocate volume toward what's converting.",
  },
  {
    number: "05",
    title: "Report",
    description:
      "You get a plain-English weekly readout: what went out, what came back, and what's booked on your calendar.",
  },
] as const;

export function ProcessSection() {
  return (
    <section
      id="process"
      className="scroll-mt-20 border-t border-hairline py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="How we work"
          title="A disciplined process, not a black box"
          description="The same five stages for every engagement, so you always know what's happening and why."
        />

        <ol className="mt-16 grid grid-cols-1 gap-10 md:grid-cols-3 lg:grid-cols-5 lg:gap-6">
          {STEPS.map((step) => (
            <li key={step.number} className="relative">
              <div className="flex items-center gap-3 lg:block">
                <span className="text-sm font-semibold text-royal tabular-nums">
                  {step.number}
                </span>
                <div
                  aria-hidden="true"
                  className="h-px flex-1 bg-hairline lg:mt-3 lg:mb-5 lg:w-full"
                />
              </div>
              <h3 className="mt-3 text-base font-semibold text-ink lg:mt-0">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-subtext">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
