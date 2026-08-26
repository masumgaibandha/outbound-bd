import Link from "next/link";

import { ChevronDownIcon } from "@/components/public/icons";
import { SectionHeading } from "@/components/public/section-heading";

type ServiceFaqSectionProps = {
  items: { question: string; answer: string }[];
};

export function ServiceFaqSection({ items }: ServiceFaqSectionProps) {
  return (
    <section className="border-t border-hairline py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHeading eyebrow="FAQ" title="Common questions" />

        <div className="mt-12 divide-y divide-hairline border-t border-b border-hairline">
          {items.map((faq) => (
            <details key={faq.question} className="group py-5">
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

        <div className="mt-8 text-center">
          <Link
            href="/faq"
            className="text-sm font-medium text-royal transition-colors hover:text-navy"
          >
            See all FAQs &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
