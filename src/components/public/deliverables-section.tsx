import { CheckIcon } from "@/components/public/icons";
import { SectionHeading } from "@/components/public/section-heading";
import { Section } from "@/components/public/section";

type DeliverablesSectionProps = {
  items: { title: string; description: string }[];
};

export function DeliverablesSection({ items }: DeliverablesSectionProps) {
  return (
    <Section tone="canvasAlt" compact labelledBy="deliverables-heading">
      <SectionHeading
        eyebrow="What's included"
        title="Deliverables"
        description="Everything that's part of this service, from day one through ongoing delivery."
      />

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.title}
            className="border-hairline bg-surface card-static border p-7"
            data-reveal
          >
            <div className="bg-action/[0.08] text-action flex h-10 w-10 items-center justify-center rounded-full">
              <CheckIcon width={18} height={18} />
            </div>
            <h3 className="text-ink mt-4 text-base font-semibold">
              {item.title}
            </h3>
            <p className="text-ink-muted mt-2 text-sm leading-relaxed">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}
