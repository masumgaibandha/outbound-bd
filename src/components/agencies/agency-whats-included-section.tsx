import { CheckIcon } from "@/components/public/icons";
import { Section } from "@/components/public/section";
import { SectionHeading } from "@/components/public/section-heading";

// Exact wording from the round's own copy, segmented into list items only —
// nothing added, nothing reworded.
const INCLUSIONS = [
  "Sending domains and inboxes (Google Workspace or Microsoft 365)",
  "SPF, DKIM and DMARC setup",
  "Inbox warm-up",
  "Verified lead lists matched to the client's ideal customer",
  "Email copy and follow-ups",
  "Campaign management in Instantly or Smartlead",
  "Reply handling",
  "Weekly reporting",
] as const;

export function AgencyWhatsIncludedSection() {
  return (
    <Section tone="canvasAlt" labelledBy="whats-included-heading">
      <SectionHeading eyebrow="What's included" title="Everything it takes to run cold email" />

      <ul className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
        {INCLUSIONS.map((item) => (
          <li key={item} className="text-ink flex items-start gap-2.5 text-sm leading-relaxed" data-reveal>
            <CheckIcon width={16} height={16} className="text-action mt-0.5 shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </Section>
  );
}
