import { ButtonLink } from "@/components/public/button";
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
          <div
            key={offer.id}
            className="flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-ink font-medium">{offer.name}</p>
              <p className="text-ink-muted mt-0.5 text-sm">
                {formatPriceCents(offer.priceCents)} &middot; {offer.unit}
              </p>
            </div>
            <ButtonLink
              href={getCatalogContactHref(offer)}
              tone="outline"
              className="shrink-0"
            >
              Request a Proposal
            </ButtonLink>
          </div>
        ))}
      </div>
    </div>
  );
}
