import { MasterclassSection } from "@/components/masterclass/MasterclassSection";
import { trustMetrics } from "@/data/masterclass-content";

/** Ported from the MasumDev masterclass source. */
export function TrustMetrics() {
  return (
    <MasterclassSection
      id="trust-metrics"
      tone="canvasAlt"
      labelledBy="trust-metrics-heading"
      className="py-8 md:py-10"
    >
      <h2 id="trust-metrics-heading" className="sr-only">
        সংক্ষিপ্ত পরিসংখ্যান
      </h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-5">
        {trustMetrics.map((metric) => (
          <div key={metric.label}>
            <dt className="sr-only">{metric.label}</dt>
            <dd>
              <span className="font-heading text-ink block text-2xl tracking-tight md:text-3xl">
                {metric.value}
              </span>
              <span className="text-ink-muted font-bengali mt-1.5 block text-xs leading-snug md:text-sm">
                {metric.label}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </MasterclassSection>
  );
}
