import { CheckIcon, XIcon } from "@/components/public/icons";
import { SectionHeading } from "@/components/public/section-heading";
import { Section } from "@/components/public/section";

type FitSectionProps = {
  goodFit: string[];
  notFit: string[];
};

export function FitSection({ goodFit, notFit }: FitSectionProps) {
  return (
    <Section tone="canvas" compact labelledBy="fit-heading">
      <SectionHeading eyebrow="Ideal fit" title="Is this the right service for you?" />

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <div className="border-hairline bg-surface border p-7">
          <h3 className="text-ink text-sm font-semibold tracking-[0.08em] uppercase">
            Good fit if
          </h3>
          <ul className="mt-5 space-y-4">
            {goodFit.map((item) => (
              <li key={item} className="flex gap-3">
                <CheckIcon
                  width={18}
                  height={18}
                  className="text-action mt-0.5 shrink-0"
                />
                <span className="text-ink-muted text-sm leading-relaxed">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-hairline bg-surface border p-7">
          <h3 className="text-ink text-sm font-semibold tracking-[0.08em] uppercase">
            Not a fit if
          </h3>
          <ul className="mt-5 space-y-4">
            {notFit.map((item) => (
              <li key={item} className="flex gap-3">
                <XIcon
                  width={18}
                  height={18}
                  className="text-ink-muted/60 mt-0.5 shrink-0"
                />
                <span className="text-ink-muted text-sm leading-relaxed">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
