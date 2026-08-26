import { ChevronDownIcon } from "@/components/public/icons";
import type { FaqEntry } from "@/components/public/faq-data";

type FaqCategorySectionProps = {
  id: string;
  label: string;
  items: FaqEntry[];
};

export function FaqCategorySection({ id, label, items }: FaqCategorySectionProps) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-hairline py-12 sm:py-14">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 className="text-xl font-semibold text-ink sm:text-2xl">{label}</h2>

        <div className="mt-6 divide-y divide-hairline border-t border-b border-hairline">
          {items.map((faq) => (
            <details key={faq.id} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-medium text-ink marker:content-none [&::-webkit-details-marker]:hidden">
                {faq.question}
                <ChevronDownIcon
                  width={18}
                  height={18}
                  className="shrink-0 text-subtext transition-transform duration-200 group-open:rotate-180"
                />
              </summary>
              <p className="mt-3 pr-8 text-sm leading-relaxed text-subtext">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
