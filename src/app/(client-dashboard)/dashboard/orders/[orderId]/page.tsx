import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";

import { CancelOrderButton } from "@/components/dashboard/cancel-order-button";
import { OrderStatusBadge } from "@/components/dashboard/order-status-badge";
import { isOrderCancellable, Order } from "@/lib/models/order";
import { connectToDatabase } from "@/lib/mongoose";
import { formatPriceCents } from "@/lib/pricing-catalog";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Order details",
};

type OrderDetailPageProps = {
  params: Promise<{ orderId: string }>;
};

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const user = await requireUser("/sign-in?redirectTo=/dashboard/orders");
  const { orderId } = await params;

  if (!isValidObjectId(orderId)) {
    notFound();
  }

  await connectToDatabase();
  const order = await Order.findById(orderId).lean();

  // An order that exists but belongs to someone else 404s exactly like one
  // that doesn't exist — never confirms another user's order id.
  if (!order || order.userId !== user.id) {
    notFound();
  }

  const { catalog } = order;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/orders"
          className="text-sm text-neutral-500 hover:text-neutral-700"
        >
          &larr; All orders
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-neutral-900">
            {catalog.name}
          </h2>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="mt-1 text-sm text-neutral-500">{order.orderNumber}</p>
      </div>

      {order.status === "AWAITING_PAYMENT" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">
            Payment instructions are coming next.
          </p>
          <p className="mt-1 text-sm text-amber-700">
            Your order is confirmed and awaiting payment. We&apos;ll follow
            up by email with next steps — nothing further is needed from you
            right now.
          </p>
        </div>
      ) : null}

      <div className="rounded-lg border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-neutral-900">Order summary</h3>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {catalog.billingType === "recurring" ? (
            <>
              <div>
                <dt className="text-xs text-neutral-500">Monthly fee</dt>
                <dd className="mt-0.5 text-sm text-neutral-900">
                  {formatPriceCents(catalog.monthlyPriceCents ?? 0)}/month
                </dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">One-time setup fee</dt>
                <dd className="mt-0.5 text-sm text-neutral-900">
                  {formatPriceCents(catalog.setupPriceCents ?? 0)}
                </dd>
              </div>
              {catalog.scope ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-neutral-500">Scope</dt>
                  <dd className="mt-0.5 text-sm text-neutral-900">
                    {[catalog.scope.campaigns, catalog.scope.inboxes]
                      .filter(Boolean)
                      .join(" · ")}
                    {catalog.scope.leadsIncluded
                      ? ` · ${catalog.scope.leadsIncluded.toLocaleString("en-US")} verified leads`
                      : ""}
                  </dd>
                </div>
              ) : null}
            </>
          ) : (
            <div>
              <dt className="text-xs text-neutral-500">Price</dt>
              <dd className="mt-0.5 text-sm text-neutral-900">
                {formatPriceCents(catalog.priceCents ?? 0)}
                {catalog.unit ? ` · ${catalog.unit}` : ""}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-neutral-500">Currency</dt>
            <dd className="mt-0.5 text-sm text-neutral-900">{catalog.currency}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-neutral-900">Order details</h3>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-neutral-500">Company</dt>
            <dd className="mt-0.5 text-sm text-neutral-900">{order.company}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Website</dt>
            <dd className="mt-0.5 text-sm text-neutral-900">{order.website}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Country</dt>
            <dd className="mt-0.5 text-sm text-neutral-900">{order.country}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Placed</dt>
            <dd className="mt-0.5 text-sm text-neutral-900">
              {new Date(order.createdAt).toLocaleString("en-US")}
            </dd>
          </div>
          {order.notes ? (
            <div className="sm:col-span-2">
              <dt className="text-xs text-neutral-500">Notes</dt>
              <dd className="mt-0.5 text-sm whitespace-pre-wrap text-neutral-900">
                {order.notes}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      {isOrderCancellable(order.status) ? (
        <div>
          <CancelOrderButton orderId={String(order._id)} />
        </div>
      ) : null}
    </div>
  );
}
