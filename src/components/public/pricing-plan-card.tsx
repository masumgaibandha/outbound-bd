import { ArrowRightIcon, CheckIcon } from "@/components/public/icons";
import { ButtonLink } from "@/components/public/button";
import {
  formatPriceCents,
  getCatalogContactHref,
  type ManagedPlan,
} from "@/lib/pricing-catalog";

const FEATURED_PLAN_ID = "growth";

export function PricingPlanCard({ plan }: { plan: ManagedPlan }) {
  const featured = plan.id === FEATURED_PLAN_ID;

  return (
    <div
      className={`flex h-full flex-col border p-8 ${
        featured ? "border-ink bg-ink text-on-dark" : "border-hairline bg-surface"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <h3
          className={`font-heading text-2xl tracking-tight ${featured ? "text-on-dark" : "text-ink"}`}
        >
          {plan.name}
        </h3>
        {featured ? (
          <span className="bg-accent text-accent-ink shrink-0 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap">
            Most popular
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span
          className={`text-4xl font-semibold tracking-tight ${featured ? "text-on-dark" : "text-ink"}`}
        >
          {formatPriceCents(plan.monthlyPriceCents)}
        </span>
        <span className={featured ? "text-on-dark-muted text-sm" : "text-ink-muted text-sm"}>
          /month
        </span>
      </div>
      <p className={`mt-1 text-sm ${featured ? "text-on-dark-muted" : "text-ink-muted"}`}>
        + {formatPriceCents(plan.setupPriceCents)} one-time setup
      </p>

      <ul
        className={`mt-6 flex-1 space-y-3 border-t pt-6 ${
          featured ? "border-on-dark/15" : "border-hairline"
        }`}
      >
        <li className="flex items-start gap-2.5 text-sm">
          <CheckIcon
            width={16}
            height={16}
            className={`mt-0.5 shrink-0 ${featured ? "text-action-dark" : "text-action"}`}
          />
          <span className={featured ? "text-on-dark/90" : "text-ink"}>
            {plan.campaigns}
          </span>
        </li>
        <li className="flex items-start gap-2.5 text-sm">
          <CheckIcon
            width={16}
            height={16}
            className={`mt-0.5 shrink-0 ${featured ? "text-action-dark" : "text-action"}`}
          />
          <span className={featured ? "text-on-dark/90" : "text-ink"}>
            {plan.leadsIncluded.toLocaleString("en-US")} verified leads
          </span>
        </li>
        <li className="flex items-start gap-2.5 text-sm">
          <CheckIcon
            width={16}
            height={16}
            className={`mt-0.5 shrink-0 ${featured ? "text-action-dark" : "text-action"}`}
          />
          <span className={featured ? "text-on-dark/90" : "text-ink"}>
            {plan.inboxes}
          </span>
        </li>
      </ul>

      <ButtonLink
        href={getCatalogContactHref(plan)}
        tone={featured ? "onDark" : "outline"}
        fullWidth
        className="mt-8"
      >
        Request a Proposal
        <ArrowRightIcon width={16} height={16} aria-hidden="true" />
      </ButtonLink>
    </div>
  );
}
