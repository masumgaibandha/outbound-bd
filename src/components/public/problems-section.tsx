import { SectionHeading } from "@/components/public/section-heading";
import { Section } from "@/components/public/section";

type ProblemsSectionProps = {
  items: { title: string; description: string }[];
};

export function ProblemsSection({ items }: ProblemsSectionProps) {
  return (
    <Section tone="canvas" compact labelledBy="problems-heading">
      <SectionHeading
        eyebrow="Where this breaks without help"
        title="Problems this service solves"
        align="left"
      />

      <div className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.title} className="flex gap-4">
            <span
              aria-hidden="true"
              className="bg-action mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full"
            />
            <div>
              <h3 className="text-ink text-base font-semibold">
                {item.title}
              </h3>
              <p className="text-ink-muted mt-1.5 text-sm leading-relaxed">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
