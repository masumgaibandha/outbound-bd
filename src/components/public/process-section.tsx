import Link from "next/link";

import { SectionHeading } from "@/components/public/section-heading";
import { Section } from "@/components/public/section";

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

type ProcessSectionProps = {
  /** Homepage uses a shorter, 4-step teaser; /how-it-works shows all 5. */
  compact?: boolean;
};

export function ProcessSection({ compact = false }: ProcessSectionProps) {
  const steps = compact ? STEPS.slice(0, 4) : STEPS;

  return (
    <Section id="process" tone="canvas" labelledBy="process-heading">
      <SectionHeading
        eyebrow="How we work"
        title="A disciplined process, not a black box"
        description={
          compact
            ? "Every engagement runs through the same stages, so you always know what's happening and why."
            : "The same five stages for every engagement, so you always know what's happening and why."
        }
      />

      <ol
        className={`mt-16 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:gap-8 ${
          compact ? "lg:grid-cols-4" : "lg:grid-cols-5"
        }`}
      >
        {steps.map((step) => (
          <li key={step.number} className="border-hairline border-t pt-6" data-reveal>
            <span className="text-action font-heading text-sm tabular-nums">
              {step.number}
            </span>
            <h3 className="text-ink mt-3 text-lg font-semibold">
              {step.title}
            </h3>
            <p className="text-ink-muted mt-2 text-sm leading-relaxed">
              {step.description}
            </p>
          </li>
        ))}
      </ol>

      {compact ? (
        <div className="mt-10">
          <Link
            href="/how-it-works"
            className="text-ink decoration-action hover:text-action focus-visible:outline-action rounded-sm text-sm font-medium underline decoration-2 underline-offset-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            See the full process →
          </Link>
        </div>
      ) : null}
    </Section>
  );
}
