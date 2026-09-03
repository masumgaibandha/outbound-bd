import { ArrowRightIcon } from "@/components/public/icons";
import {
  MasterclassSection,
  eyebrowClass,
  eyebrowDotClass,
} from "@/components/masterclass/MasterclassSection";
import { workflow } from "@/data/masterclass-content";

/**
 * Two markup blocks, toggled by CSS breakpoint only (no JS, no animation):
 * a vertical connected timeline below `md`, and a wrapped horizontal chip
 * row with directional arrows at `md` and above. Both render from the same
 * `workflow.steps` data. Ported from the MasumDev masterclass source.
 */
export function Workflow() {
  return (
    <MasterclassSection id="workflow" labelledBy="workflow-heading">
      <p className={eyebrowClass}>
        <span aria-hidden="true" className={eyebrowDotClass} />
        {workflow.label}
      </p>
      <h2
        id="workflow-heading"
        className="type-section font-bengali text-ink mt-4 max-w-2xl text-balance"
      >
        {workflow.heading}
      </h2>

      {/* Mobile / tablet: vertical timeline with a connecting line. */}
      <ol className="mt-8 flex flex-col md:hidden">
        {workflow.steps.map((step, index) => (
          <li key={step.label} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span className="bg-ink text-on-dark flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                {index + 1}
              </span>
              {index < workflow.steps.length - 1 ? (
                <span aria-hidden="true" className="bg-hairline my-1 w-px flex-1" />
              ) : null}
            </div>
            <div className={index < workflow.steps.length - 1 ? "pb-6" : undefined}>
              <span className="text-ink pt-1.5 text-base font-semibold">
                {step.label}
              </span>
            </div>
          </li>
        ))}
      </ol>

      {/* Desktop: connected horizontal sequence, wraps onto further rows if needed. */}
      <ol className="mt-8 hidden flex-wrap items-center gap-y-5 md:flex">
        {workflow.steps.map((step, index) => (
          <li key={step.label} className="flex items-center">
            <span className="border-hairline bg-surface text-ink inline-flex items-center gap-2.5 rounded-xl border px-5 py-3.5">
              <span
                className="bg-ink text-on-dark flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <span className="text-base font-semibold">{step.label}</span>
            </span>
            {index < workflow.steps.length - 1 ? (
              <ArrowRightIcon
                className="text-action mx-2.5 size-5 shrink-0"
                aria-hidden="true"
              />
            ) : null}
          </li>
        ))}
      </ol>
    </MasterclassSection>
  );
}
