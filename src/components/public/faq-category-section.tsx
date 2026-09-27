import Link from "next/link";

import { ChevronDownIcon } from "@/components/public/icons";
import type { FaqEntry } from "@/components/public/faq-data";
import { Section, type SectionTone } from "@/components/public/section";

type FaqCategorySectionProps = {
  id: string;
  label: string;
  items: FaqEntry[];
  tone?: SectionTone;
};

export function FaqCategorySection({ id, label, items, tone = "canvas" }: FaqCategorySectionProps) {
  return (
    <Section id={id} tone={tone} compact labelledBy={`${id}-heading`}>
      <div className="mx-auto max-w-3xl">
        <h2 id={`${id}-heading`} className="font-heading text-ink text-2xl tracking-tight">
          {label}
        </h2>

        <div className="divide-hairline border-hairline mt-6 divide-y border-t border-b">
          {items.map((faq) => (
            <details key={faq.id} className="group py-5">
              <summary className="text-ink flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-medium marker:content-none [&::-webkit-details-marker]:hidden">
                {faq.question}
                <ChevronDownIcon
                  width={18}
                  height={18}
                  className="text-ink-muted shrink-0 transition-transform duration-200 group-open:rotate-180"
                />
              </summary>
              <p className="text-ink-muted mt-3 pr-8 text-sm leading-relaxed">
                {faq.answer}
              </p>
              {faq.link ? (
                <Link
                  href={faq.link.href}
                  className="text-ink decoration-action hover:text-action focus-visible:outline-action mt-3 inline-block rounded-sm text-sm font-medium underline decoration-2 underline-offset-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
                >
                  {faq.link.label} <span aria-hidden="true">→</span>
                </Link>
              ) : null}
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}
