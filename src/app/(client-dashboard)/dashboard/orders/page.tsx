import type { Metadata } from "next";
import Link from "next/link";

import { OrderStatusBadge } from "@/components/dashboard/order-status-badge";
import { formatPriceCents } from "@/lib/pricing-catalog";
import { connectToDatabase } from "@/lib/mongoose";
import { Order } from "@/lib/models/order";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Orders",
};

function orderPriceLabel(catalog: { billingType: string; monthlyPriceCents?: number; priceCents?: number }) {
  if (catalog.billingType === "recurring" && catalog.monthlyPriceCents != null) {
    return `${formatPriceCents(catalog.monthlyPriceCents)}/mo`;
  }
  if (catalog.priceCents != null) {
    return formatPriceCents(catalog.priceCents);
  }
  return "—";
}

export default async function OrdersPage() {
  const user = await requireUser("/sign-in?redirectTo=/dashboard/orders");

  await connectToDatabase();
  const orders = await Order.find({ userId: user.id })
    .sort({ createdAt: -1 })
    .lean();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Orders</h2>
        <p className="text-sm text-neutral-500">
          Everything you&apos;ve ordered, and its current status.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center">
          <h3 className="text-base font-medium text-neutral-900">
            No orders yet
          </h3>
          <p className="mt-1 max-w-sm text-sm text-neutral-500">
            Browse pricing to order a managed plan or a one-time service.
          </p>
          <Link
            href="/pricing"
            className="mt-4 text-sm font-medium text-neutral-900 underline underline-offset-2"
          >
            View pricing
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <ul className="divide-y divide-neutral-200">
            {orders.map((order) => (
              <li key={String(order._id)}>
                <Link
                  href={`/dashboard/orders/${String(order._id)}`}
                  className="flex flex-col gap-2 p-4 transition-colors hover:bg-neutral-50 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                >
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      {order.catalog.name}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {order.orderNumber} &middot;{" "}
                      {new Date(order.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-neutral-700">
                      {orderPriceLabel(order.catalog)}
                    </span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
