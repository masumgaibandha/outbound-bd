import { CheckIcon } from "@/components/public/icons";
import { SectionHeading } from "@/components/public/section-heading";
import { Section } from "@/components/public/section";

type RequirementsSectionProps = {
  items: string[];
};

export function RequirementsSection({ items }: RequirementsSectionProps) {
  return (
    <Section tone="canvasAlt" compact labelledBy="requirements-heading">
      <SectionHeading
        eyebrow="Getting started"
        title="What we need from you"
        align="left"
      />

      <ul className="mt-10 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <CheckIcon
              width={18}
              height={18}
              className="text-action mt-0.5 shrink-0"
            />
            <span className="text-ink-muted text-sm leading-relaxed">
              {item}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
