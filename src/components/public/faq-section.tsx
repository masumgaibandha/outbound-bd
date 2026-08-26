import Link from "next/link";

import { ChevronDownIcon } from "@/components/public/icons";
import { getFaqsByIds } from "@/components/public/faq-data";
import { SectionHeading } from "@/components/public/section-heading";

const FAQS = getFaqsByIds([
  "timelines-results-speed",
  "deliverability-protect-reputation",
  "support-crm-integration",
  "results-qualified-conversation",
  "compliance-gdpr-canspam",
  "process-copywriting",
]);

export function FaqSection() {
  return (
    <section
      id="faq"
      className="scroll-mt-20 border-t border-hairline py-20 sm:py-28"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHeading eyebrow="FAQ" title="Common questions" />

        <div className="mt-12 divide-y divide-hairline border-t border-b border-hairline">
          {FAQS.map((faq) => (
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
