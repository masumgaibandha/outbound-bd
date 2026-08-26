import { SectionHeading } from "@/components/public/section-heading";

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
    <section className="border-t border-hairline py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Expertise"
          title="Hands-on across every discipline outbound needs"
          align="left"
        />

        <ul className="mt-10 flex flex-wrap gap-3">
          {EXPERTISE.map((skill) => (
            <li
              key={skill}
              className="rounded-md border border-hairline px-4 py-2 text-sm font-medium text-ink"
            >
              {skill}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
