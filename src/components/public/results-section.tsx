import { SectionHeading } from "@/components/public/section-heading";

const CASE_STUDY_SLOTS = [
  { industry: "B2B SaaS" },
  { industry: "Professional Services" },
  { industry: "Manufacturing & Industrial" },
] as const;

const METRIC_LABELS = ["Reply rate", "Positive replies", "Meetings booked"] as const;

export function ResultsSection() {
  return (
    <section
      id="results"
      className="scroll-mt-20 border-t border-hairline bg-canvas py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Results"
          title="Case studies are added as engagements complete"
          description="We only publish figures once a client has reviewed and approved them. Here's the format each case study will follow."
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {CASE_STUDY_SLOTS.map((slot) => (
            <article
              key={slot.industry}
              className="flex flex-col rounded-xl border border-dashed border-hairline p-7"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-medium text-subtext">
                  {slot.industry}
                </span>
                <span className="shrink-0 rounded-full bg-hairline/70 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-subtext uppercase">
                  Placeholder
                </span>
              </div>

              <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-hairline pt-6">
                {METRIC_LABELS.map((label) => (
                  <div key={label}>
                    <dt className="text-xs text-subtext">{label}</dt>
                    <dd className="mt-1 text-2xl font-semibold text-ink/30">
                      —
                    </dd>
                  </div>
                ))}
              </dl>

              <p className="mt-6 text-sm leading-relaxed text-subtext italic">
                Real client results will appear here once a campaign is
                complete and the client has approved them for publication.
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
