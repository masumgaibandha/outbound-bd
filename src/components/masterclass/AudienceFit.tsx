import { CheckIcon, XIcon } from "@/components/public/icons";
import { MasterclassSection } from "@/components/masterclass/MasterclassSection";
import { audienceFit } from "@/data/masterclass-content";

/** Ported from the MasumDev masterclass source. */
export function AudienceFit() {
  return (
    <MasterclassSection id="audience" tone="canvasAlt" labelledBy="audience-heading">
      <h2 id="audience-heading" className="sr-only">
        কাদের জন্য এই মাস্টারক্লাস
      </h2>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="border-hairline bg-surface border p-6 md:p-8">
          <p className="text-action text-xs font-semibold tracking-[0.14em] uppercase">
            {audienceFit.join.label}
          </p>
          <h3 className="font-heading text-ink mt-3 text-xl tracking-tight">
            {audienceFit.join.heading}
          </h3>
          <ul className="mt-5 space-y-3">
            {audienceFit.join.items.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckIcon className="text-action mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span className="text-ink text-sm leading-relaxed md:text-base">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-hairline bg-canvas-alt border p-6 md:p-8">
          <p className="text-ink-muted text-xs font-semibold tracking-[0.14em] uppercase">
            {audienceFit.skip.label}
          </p>
          <h3 className="font-heading text-ink mt-3 text-xl tracking-tight">
            {audienceFit.skip.heading}
          </h3>
          <ul className="mt-5 space-y-3">
            {audienceFit.skip.items.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <XIcon className="text-ink-muted mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span className="text-ink-muted text-sm leading-relaxed md:text-base">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </MasterclassSection>
  );
}
