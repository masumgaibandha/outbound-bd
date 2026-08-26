import Link from "next/link";
import { buttonVariants } from "@heroui/styles";

import { CheckIcon } from "@/components/public/icons";
import {
  formatPriceCents,
  getCatalogContactHref,
  type ManagedPlan,
} from "@/lib/pricing-catalog";

export function PricingPlanCard({ plan }: { plan: ManagedPlan }) {
  return (
    <div className="flex flex-col rounded-xl border border-hairline p-8">
      <h3 className="text-xl font-semibold text-ink">{plan.name}</h3>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-4xl font-semibold tracking-tight text-ink">
          {formatPriceCents(plan.monthlyPriceCents)}
        </span>
        <span className="text-sm text-subtext">/month</span>
      </div>
      <p className="mt-1 text-sm text-subtext">
        + {formatPriceCents(plan.setupPriceCents)} one-time setup
      </p>

      <ul className="mt-6 flex flex-col gap-2.5 border-t border-hairline pt-6">
        <li className="flex items-start gap-2.5 text-sm text-ink">
          <CheckIcon width={16} height={16} className="mt-0.5 shrink-0 text-royal" />
          {plan.campaigns}
        </li>
        <li className="flex items-start gap-2.5 text-sm text-ink">
          <CheckIcon width={16} height={16} className="mt-0.5 shrink-0 text-royal" />
          {plan.leadsIncluded.toLocaleString("en-US")} verified leads
        </li>
        <li className="flex items-start gap-2.5 text-sm text-ink">
          <CheckIcon width={16} height={16} className="mt-0.5 shrink-0 text-royal" />
          {plan.inboxes}
        </li>
      </ul>

      <Link
        href={getCatalogContactHref(plan)}
        className={`${buttonVariants({ variant: "primary" })} mt-8 w-full rounded-lg`}
      >
        Get started with {plan.name}
      </Link>
    </div>
  );
}
