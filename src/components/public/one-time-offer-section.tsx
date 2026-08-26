import Link from "next/link";
import { buttonVariants } from "@heroui/styles";

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
      <h3 className="text-sm font-semibold tracking-[0.08em] text-ink uppercase">
        {label}
      </h3>
      <div className="mt-4 divide-y divide-hairline border-t border-b border-hairline">
        {offers.map((offer) => (
          <div
            key={offer.id}
            className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-medium text-ink">{offer.name}</p>
              <p className="mt-0.5 text-sm text-subtext">
                {formatPriceCents(offer.priceCents)} &middot; {offer.unit}
              </p>
            </div>
            <Link
              href={getCatalogContactHref(offer)}
              className={`${buttonVariants({ variant: "outline", size: "sm" })} rounded-lg`}
            >
              Request this
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
