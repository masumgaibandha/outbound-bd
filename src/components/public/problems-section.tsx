import { SectionHeading } from "@/components/public/section-heading";

type ProblemsSectionProps = {
  items: { title: string; description: string }[];
};

export function ProblemsSection({ items }: ProblemsSectionProps) {
  return (
    <section className="border-t border-hairline py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
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
                className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-royal"
              />
              <div>
                <h3 className="text-base font-semibold text-ink">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-subtext">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
