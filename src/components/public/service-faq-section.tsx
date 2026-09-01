import Link from "next/link";

import { ChevronDownIcon } from "@/components/public/icons";
import { SectionHeading } from "@/components/public/section-heading";
import { Section } from "@/components/public/section";

type ServiceFaqSectionProps = {
  items: { question: string; answer: string }[];
};

export function ServiceFaqSection({ items }: ServiceFaqSectionProps) {
  return (
    <Section tone="canvasAlt" compact labelledBy="service-faq-heading">
      <div className="mx-auto max-w-3xl">
        <SectionHeading eyebrow="FAQ" title="Common questions" />

        <div className="divide-hairline border-hairline mt-12 divide-y border-t border-b">
          {items.map((faq) => (
            <details key={faq.question} className="group py-5">
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
            </details>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/faq"
            className="text-ink decoration-action hover:text-action focus-visible:outline-action rounded-sm text-sm font-medium underline decoration-2 underline-offset-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            See all FAQs →
          </Link>
        </div>
      </div>
    </Section>
  );
}
