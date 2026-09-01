import { SectionHeading } from "@/components/public/section-heading";
import { Section } from "@/components/public/section";

const CASE_STUDY_SLOTS = [
  { industry: "B2B SaaS" },
  { industry: "Professional Services" },
  { industry: "Manufacturing & Industrial" },
] as const;

const METRIC_LABELS = ["Reply rate", "Positive replies", "Meetings booked"] as const;

export function ResultsSection() {
  return (
    <Section id="case-studies" tone="canvasAlt" labelledBy="case-studies-heading">
      <SectionHeading
        eyebrow="Case studies"
        title="Added as engagements complete"
        description="We only publish figures once a client has reviewed and approved them. Here's the format each case study will follow."
      />

      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        {CASE_STUDY_SLOTS.map((slot) => (
          <article
            key={slot.industry}
            className="border-hairline flex flex-col border border-dashed p-7"
            data-reveal
          >
            <div className="flex items-start justify-between gap-3">
              <span className="text-ink-muted text-sm font-medium">
                {slot.industry}
              </span>
              <span className="bg-hairline/70 text-ink-muted shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase">
                Placeholder
              </span>
            </div>

            <dl className="border-hairline mt-6 grid grid-cols-3 gap-3 border-t pt-6">
              {METRIC_LABELS.map((label) => (
                <div key={label}>
                  <dt className="text-ink-muted text-xs">{label}</dt>
                  <dd className="text-ink/30 mt-1 text-2xl font-semibold">—</dd>
                </div>
              ))}
            </dl>

            <p className="text-ink-muted mt-6 text-sm leading-relaxed italic">
              Real client results will appear here once a campaign is
              complete and the client has approved them for publication.
            </p>
          </article>
        ))}
      </div>
    </Section>
  );
}
