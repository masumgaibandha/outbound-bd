import { SectionHeading } from "@/components/public/section-heading";
import { Section } from "@/components/public/section";

const EXPERTISE = [
  "Lead generation",
  "Prospect research",
  "Email infrastructure",
  "Deliverability",
  "Campaign strategy",
  "Copywriting",
  "Campaign management",
  "Reply handling",
] as const;

export function ExpertiseSection() {
  return (
    <Section tone="canvasAlt" compact labelledBy="expertise-heading">
      <SectionHeading
        eyebrow="Expertise"
        title="Hands-on across every discipline outbound needs"
        align="left"
      />

      <ul className="mt-10 flex flex-wrap gap-3">
        {EXPERTISE.map((skill) => (
          <li
            key={skill}
            className="border-hairline text-ink rounded-full border px-4 py-2 text-sm font-medium"
          >
            {skill}
          </li>
        ))}
      </ul>
    </Section>
  );
}
