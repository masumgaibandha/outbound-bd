import { Section } from "@/components/public/section";
import { SectionHeading } from "@/components/public/section-heading";

const STEPS = [
  {
    number: "01",
    title: "You bring the client",
    description: "Share their offer and who they sell to.",
  },
  {
    number: "02",
    title: "I build and run it",
    description:
      "Domains, warm-up, verified lists, copy, sending and reply handling, all under your agency's name.",
  },
  {
    number: "03",
    title: "You bill the client",
    description:
      "You get weekly reports you can forward as your own, and you set your own price.",
  },
] as const;

export function AgencyHowItWorksSection() {
  return (
    <Section tone="canvas" labelledBy="how-it-works-heading">
      <SectionHeading eyebrow="How it works" title="From brief to billing, in three steps" />

      <ol className="mt-16 grid grid-cols-1 gap-10 sm:grid-cols-3">
        {STEPS.map((step) => (
          <li key={step.number} className="border-hairline border-t pt-6" data-reveal>
            <span className="text-action font-heading text-sm tabular-nums">
              {step.number}
            </span>
            <h3 className="text-ink mt-3 text-lg font-semibold">{step.title}</h3>
            <p className="text-ink-muted mt-2 text-sm leading-relaxed">
              {step.description}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
