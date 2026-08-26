import { SectionHeading } from "@/components/public/section-heading";

type NumberedProcessSectionProps = {
  items: { title: string; description: string }[];
};

export function NumberedProcessSection({ items }: NumberedProcessSectionProps) {
  return (
    <section className="border-t border-hairline py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="How it works"
          title="Process"
          description="A disciplined, repeatable sequence for this service — so you always know what's happening and why."
        />

        <ol className="mt-14 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {items.map((step, index) => (
            <li key={step.title} className="relative">
              <div className="flex items-center gap-3 lg:block">
                <span className="text-sm font-semibold text-royal tabular-nums">
                  {String(index + 1).padStart(2, "0")}
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
