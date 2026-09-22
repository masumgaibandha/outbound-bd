import { ChevronDownIcon } from "@/components/public/icons";
import { Section } from "@/components/public/section";
import { SectionHeading } from "@/components/public/section-heading";

// Exact wording from the round's own copy - do not reword.
const FAQ_ITEMS = [
  {
    question: "Will my client know you exist?",
    answer: "Only if you want them to. Everything runs under your agency's name.",
  },
  {
    question: "How soon do campaigns start?",
    answer:
      "New domains need 2 to 3 weeks of warm-up, so the first emails usually go out in week 3.",
  },
  {
    question: "Do you guarantee meetings?",
    answer:
      "No. I guarantee the setup and the work. Results depend on the offer and the market, and I'll tell you honestly if I think a client isn't a good fit for cold email.",
  },
] as const;

export function AgencyFaqSection() {
  return (
    <Section tone="canvas" compact labelledBy="agency-faq-heading">
      <div className="mx-auto max-w-3xl">
        <SectionHeading eyebrow="FAQ" title="Common questions" />

        <div className="divide-hairline border-hairline mt-12 divide-y border-t border-b">
          {FAQ_ITEMS.map((faq) => (
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
      </div>
    </Section>
  );
}
