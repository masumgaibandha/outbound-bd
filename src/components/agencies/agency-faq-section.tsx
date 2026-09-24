import { FINAL_CTA_ID } from "@/components/agencies/agency-anchors";
import { AgencyScrollToFormLink } from "@/components/agencies/agency-scroll-to-form-link";
import { ChevronDownIcon } from "@/components/public/icons";
import { Section } from "@/components/public/section";
import { SectionHeading } from "@/components/public/section-heading";

// Exact wording from the round's own copy, so do not reword.
const FAQ_ITEMS = [
  {
    question: "Isn't this just email marketing?",
    answer:
      "No. Email marketing sends newsletters to people who already signed up. Cold email sends short, personal emails to hand-picked prospects who don't know your client yet, from separate domains so your client's main domain stays safe. The goal is booked sales calls.",
  },
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
    question: "Is there a contract?",
    answer:
      "No. It's month-to-month. The setup fee is paid upfront and covers the domains, inboxes and warm-up.",
  },
  {
    question: "Do you guarantee meetings?",
    answer:
      "No. I guarantee the setup and the work. Results depend on the offer and the market, and I'll tell you honestly if I think a client isn't a good fit for cold email.",
  },
  {
    question: "How do I pay?",
    answer:
      "By invoice, once we agree on the scope. International payments are fine, and I'll send the payment options with your invoice.",
  },
] as const;

export function AgencyFaqSection() {
  return (
    <Section tone="canvasAlt" labelledBy="agency-faq-heading">
      <div className="mx-auto max-w-3xl">
        <div id="agency-faq-heading">
          <SectionHeading title="Common questions" />
        </div>

        <div className="divide-hairline border-hairline mt-12 divide-y border-t border-b">
          {FAQ_ITEMS.map((faq) => (
            <details key={faq.question} className="group py-5">
              <summary className="text-ink flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-medium marker:content-none [&::-webkit-details-marker]:hidden">
                {faq.question}
                <ChevronDownIcon
                  width={18}
                  height={18}
                  aria-hidden="true"
                  className="text-ink-muted shrink-0 transition-transform duration-200 group-open:rotate-180"
                />
              </summary>
              <p className="text-ink-muted mt-3 pr-8 text-sm leading-relaxed">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>

        <div id={FINAL_CTA_ID} className="mt-12 flex justify-center">
          <AgencyScrollToFormLink>Get the details</AgencyScrollToFormLink>
        </div>
      </div>
    </Section>
  );
}
