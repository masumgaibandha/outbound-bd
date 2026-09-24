import { Section } from "@/components/public/section";
import { SectionHeading } from "@/components/public/section-heading";
import { formatPriceCents, getStartingMonthlyPriceCents } from "@/lib/pricing-catalog";

/** The illustrative client price from this page's own copy. Only the
 * example charge is fixed; what the agency pays always comes from the
 * catalog, and the margin is plain integer-cents subtraction. */
export const EXAMPLE_CLIENT_CHARGE_CENTS = 150_000;

export function getAgencyMathFigures() {
  const clientChargeCents = EXAMPLE_CLIENT_CHARGE_CENTS;
  const agencyPaysCents = getStartingMonthlyPriceCents();
  const agencyKeepsCents = clientChargeCents - agencyPaysCents;

  return [
    { lead: "You charge your client", cents: clientChargeCents },
    { lead: "You pay from", cents: agencyPaysCents },
    { lead: "You keep", cents: agencyKeepsCents },
  ] as const;
}

export function AgencyMathSection() {
  const figures = getAgencyMathFigures();

  return (
    <Section tone="canvasAlt" labelledBy="agency-math-heading">
      <div id="agency-math-heading">
        <SectionHeading title="Add a service without adding payroll" />
      </div>

      <dl className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3" data-reveal>
        {figures.map((figure, index) => (
          <div
            key={figure.lead}
            data-testid="agency-math-figure"
            className={`border p-6 text-center md:p-8 ${
              index === figures.length - 1 ? "border-action bg-surface" : "border-hairline bg-canvas"
            }`}
          >
            <dt className="text-ink-muted text-sm">{figure.lead}</dt>
            <dd className="font-heading text-ink mt-2 text-3xl tracking-tight md:text-4xl">
              {formatPriceCents(figure.cents)}
              <span className="text-ink-muted font-sans text-base">/month</span>
            </dd>
          </div>
        ))}
      </dl>

      <p className="text-ink mx-auto mt-8 max-w-2xl text-center text-base">
        You set your own price. The figures above are an example.
      </p>
      <p className="text-ink-muted mx-auto mt-2 max-w-2xl text-center text-sm">
        Domains, inboxes and sending tools are billed separately, at cost.
      </p>
    </Section>
  );
}
