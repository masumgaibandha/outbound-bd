import { CheckIcon, XIcon } from "@/components/public/icons";
import { SectionHeading } from "@/components/public/section-heading";

type FitSectionProps = {
  goodFit: string[];
  notFit: string[];
};

export function FitSection({ goodFit, notFit }: FitSectionProps) {
  return (
    <section className="border-t border-hairline bg-canvas py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow="Ideal fit" title="Is this the right service for you?" />

        <div className="mt-12 grid gap-8 md:grid-cols-2">
          <div className="rounded-xl border border-hairline p-7">
            <h3 className="text-sm font-semibold tracking-[0.08em] text-ink uppercase">
              Good fit if
            </h3>
            <ul className="mt-5 space-y-4">
              {goodFit.map((item) => (
                <li key={item} className="flex gap-3">
                  <CheckIcon
                    width={18}
                    height={18}
                    className="mt-0.5 shrink-0 text-royal"
                  />
                  <span className="text-sm leading-relaxed text-subtext">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-hairline p-7">
            <h3 className="text-sm font-semibold tracking-[0.08em] text-ink uppercase">
              Not a fit if
            </h3>
            <ul className="mt-5 space-y-4">
              {notFit.map((item) => (
                <li key={item} className="flex gap-3">
                  <XIcon
                    width={18}
                    height={18}
                    className="mt-0.5 shrink-0 text-subtext/60"
                  />
                  <span className="text-sm leading-relaxed text-subtext">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
