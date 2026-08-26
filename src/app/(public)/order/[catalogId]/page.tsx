import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { OrderConfirmForm } from "@/components/public/order-confirm-form";
import { getCurrentSession } from "@/lib/session";
import { formatPriceCents, getCatalogEntryById } from "@/lib/pricing-catalog";

type OrderPageProps = {
  params: Promise<{ catalogId: string }>;
};

export async function generateMetadata({
  params,
}: OrderPageProps): Promise<Metadata> {
  const { catalogId } = await params;
  const entry = getCatalogEntryById(catalogId);
  return { title: entry ? `Order ${entry.name}` : "Order" };
}

export default async function OrderPage({ params }: OrderPageProps) {
  const { catalogId } = await params;
  const entry = getCatalogEntryById(catalogId);

  // Only fixed catalog items can be ordered — anything not in the catalog
  // (including the general services, which are contact-only) 404s here.
  if (!entry) {
    notFound();
  }

  const session = await getCurrentSession();
  if (!session) {
    redirect(`/sign-in?redirectTo=${encodeURIComponent(`/order/${catalogId}`)}`);
  }

  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <nav aria-label="Breadcrumb" className="text-sm text-subtext">
          <Link href="/pricing" className="transition-colors hover:text-ink">
            Pricing
          </Link>
          <span className="mx-2">/</span>
          <span className="text-ink/70">Order</span>
        </nav>

        <p className="mt-6 text-xs font-semibold tracking-[0.14em] text-royal uppercase">
          Confirm order
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance text-ink sm:text-4xl">
          {entry.name}
        </h1>

        <div className="mt-8 rounded-xl border border-hairline p-6 sm:p-8">
          {entry.kind === "managed-plan" ? (
            <>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold tracking-tight text-ink">
                  {formatPriceCents(entry.monthlyPriceCents)}
                </span>
                <span className="text-sm text-subtext">/month</span>
              </div>
              <p className="mt-1 text-sm text-subtext">
                + {formatPriceCents(entry.setupPriceCents)} one-time setup
              </p>
              <ul className="mt-5 flex flex-col gap-1.5 text-sm text-subtext">
                <li>{entry.campaigns}</li>
                <li>{entry.leadsIncluded.toLocaleString("en-US")} verified leads</li>
                <li>{entry.inboxes}</li>
              </ul>
            </>
          ) : (
            <>
              <span className="text-3xl font-semibold tracking-tight text-ink">
                {formatPriceCents(entry.priceCents)}
              </span>
              <p className="mt-1 text-sm text-subtext">{entry.unit}</p>
            </>
          )}
        </div>

        <div className="mt-10 rounded-xl border border-hairline p-6 sm:p-8">
          <OrderConfirmForm catalogId={entry.id} />
        </div>
      </div>
    </section>
  );
}
