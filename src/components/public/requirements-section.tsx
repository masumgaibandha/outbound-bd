import { CheckIcon } from "@/components/public/icons";
import { SectionHeading } from "@/components/public/section-heading";

type RequirementsSectionProps = {
  items: string[];
};

export function RequirementsSection({ items }: RequirementsSectionProps) {
  return (
    <section className="border-t border-hairline bg-canvas py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
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
                className="mt-0.5 shrink-0 text-royal"
              />
              <span className="text-sm leading-relaxed text-subtext">
                {item}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
