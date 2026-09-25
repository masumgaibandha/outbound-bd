import { COLD_EMAIL_AUDIENCE } from "@/components/cold-email/cold-email-copy";
import { CheckIcon } from "@/components/public/icons";
import { Section } from "@/components/public/section";
import { SectionHeading } from "@/components/public/section-heading";

export function ColdEmailAudienceSection() {
  return (
    <Section tone="canvasAlt" labelledBy="cold-email-audience-heading">
      <div id="cold-email-audience-heading">
        <SectionHeading title="Who this works for" />
      </div>

      <ul className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
        {COLD_EMAIL_AUDIENCE.map((item) => (
          <li
            key={item}
            className="border-hairline bg-surface flex items-start gap-3 border p-6 md:p-7"
            data-reveal
          >
            <CheckIcon width={18} height={18} aria-hidden="true" className="text-action mt-0.5 shrink-0" />
            <p className="text-ink text-sm leading-relaxed md:text-base">{item}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
