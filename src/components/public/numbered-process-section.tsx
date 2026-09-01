import { SectionHeading } from "@/components/public/section-heading";
import { Section } from "@/components/public/section";

type NumberedProcessSectionProps = {
  items: { title: string; description: string }[];
};

export function NumberedProcessSection({ items }: NumberedProcessSectionProps) {
  return (
    <Section tone="canvas" compact labelledBy="numbered-process-heading">
      <SectionHeading
        eyebrow="How it works"
        title="Process"
        description="A disciplined, repeatable sequence for this service — so you always know what's happening and why."
      />

      <ol className="mt-14 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {items.map((step, index) => (
          <li key={step.title} className="border-hairline border-t pt-6" data-reveal>
            <span className="text-action font-heading text-sm tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="text-ink mt-3 text-base font-semibold">
              {step.title}
            </h3>
            <p className="text-ink-muted mt-2 text-sm leading-relaxed">
              {step.description}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
