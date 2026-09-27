import Link from "next/link";

import { ArrowRightIcon } from "@/components/public/icons";
import {
  formatPriceCents,
  getCatalogContactHref,
  type OneTimeOffer,
} from "@/lib/pricing-catalog";

export function OneTimeOfferSection({
  label,
  offers,
}: {
  label: string;
  offers: OneTimeOffer[];
}) {
  return (
    <div>
      <h3 className="text-ink-muted text-xs font-semibold tracking-[0.16em] uppercase">
        {label}
      </h3>
      <div className="divide-hairline border-hairline mt-5 divide-y border-t border-b">
        {offers.map((offer) => (
          // The whole row is the link, so its accessible name is the offer
          // name and price (plus the sr-only purpose); the arrow is decorative.
          <Link
            key={offer.id}
            href={getCatalogContactHref(offer)}
            className="group hover:bg-accent/40 focus-visible:outline-action flex items-center justify-between gap-4 px-3 py-6 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 motion-reduce:transition-none"
          >
            <div>
              <span className="sr-only">Request a proposal: </span>
              <p className="text-ink group-hover:text-action group-focus-visible:text-action font-medium transition-colors motion-reduce:transition-none">
                {offer.name}
              </p>
              <p className="text-ink-muted mt-0.5 text-sm">
                {formatPriceCents(offer.priceCents)} &middot; {offer.unit}
              </p>
            </div>
            <ArrowRightIcon
              width={18}
              height={18}
              className="text-ink-muted group-hover:text-action group-focus-visible:text-action shrink-0 transition-[color,transform] duration-200 group-hover:translate-x-1 group-focus-visible:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-focus-visible:translate-x-0"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
