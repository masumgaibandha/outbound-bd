import { CheckIcon } from "@/components/public/icons";
import { SectionHeading } from "@/components/public/section-heading";

type DeliverablesSectionProps = {
  items: { title: string; description: string }[];
};

export function DeliverablesSection({ items }: DeliverablesSectionProps) {
  return (
    <section className="border-t border-hairline py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="What's included"
          title="Deliverables"
          description="Everything that's part of this service, from day one through ongoing delivery."
        />

        <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.title} className="bg-canvas p-7">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy/[0.06] text-navy">
                <CheckIcon width={18} height={18} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-ink">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-subtext">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
