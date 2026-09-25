import { CheckIcon } from "@/components/public/icons";
import { Section } from "@/components/public/section";
import { SectionHeading } from "@/components/public/section-heading";

export interface HowItWorksStep {
  number: string;
  title: string;
  description: string;
}

// Exact wording from the round's own copy, so do not reword.
const AGENCY_STEPS: readonly HowItWorksStep[] = [
  {
    number: "1",
    title: "You bring the client.",
    description: "Share their offer and who they sell to.",
  },
  {
    number: "2",
    title: "I build and run it.",
    description:
      "Domains, warm-up, lists, copy, sending and reply handling, all under your agency's name.",
  },
  {
    number: "3",
    title: "You bill the client.",
    description: "Weekly reports you can forward as your own.",
  },
];

/** The one line other landing pages reword (e.g. "your ideal customer" on /cold-email). */
export const AGENCY_LEAD_LIST_INCLUSION = "Verified lead lists matched to the client's ideal customer";

// Unchanged from the previous standalone "What's included" section.
export const AGENCY_INCLUSIONS: readonly string[] = [
  "Sending domains and inboxes (Google Workspace or Microsoft 365)",
  "SPF, DKIM and DMARC setup",
  "Inbox warm-up",
  AGENCY_LEAD_LIST_INCLUSION,
  "Email copy and follow-ups",
  "Campaign management in Instantly or Smartlead",
  "Reply handling",
  "Weekly reporting",
];

export function AgencyHowItWorksSection({
  steps = AGENCY_STEPS,
  inclusions = AGENCY_INCLUSIONS,
}: {
  steps?: readonly HowItWorksStep[];
  inclusions?: readonly string[];
}) {
  return (
    <Section tone="canvasAlt" labelledBy="agency-how-it-works-heading">
      <div id="agency-how-it-works-heading">
        <SectionHeading title="How it works" />
      </div>

      <ol className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-10">
        {steps.map((step) => (
          <li key={step.number} className="border-hairline border-t pt-6" data-reveal>
            <span className="text-action font-heading text-2xl tabular-nums">
              {step.number}
            </span>
            <h3 className="text-ink mt-2 text-lg font-semibold">{step.title}</h3>
            <p className="text-ink-muted mt-2 text-sm leading-relaxed">
              {step.description}
            </p>
          </li>
        ))}
      </ol>

      <div className="border-hairline bg-surface mx-auto mt-14 max-w-3xl border p-7 md:p-9" data-reveal>
        <h3 className="text-ink text-center text-lg font-semibold">What&apos;s included</h3>
        <ul className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3.5 sm:grid-cols-2">
          {inclusions.map((item) => (
            <li key={item} className="text-ink flex items-start gap-2.5 text-sm leading-relaxed">
              <CheckIcon width={16} height={16} aria-hidden="true" className="text-action mt-0.5 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
