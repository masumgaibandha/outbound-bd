import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";

import { CancelOrderButton } from "@/components/dashboard/cancel-order-button";
import { OrderStatusBadge } from "@/components/dashboard/order-status-badge";
import { PaymentStatusBadge } from "@/components/dashboard/payment-status-badge";
import { PaymentStatusPanel } from "@/components/dashboard/payment-status-panel";
import {
  PaymentSubmissionForm,
  type SubmittablePaymentMethod,
} from "@/components/dashboard/payment-submission-form";
import { isOrderCancellable, Order } from "@/lib/models/order";
import { PaymentMethod } from "@/lib/models/payment-method";
import { Payment } from "@/lib/models/payment";
import { PaymentAttempt } from "@/lib/models/payment-attempt";
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

  const payment = await Payment.findOne({ orderId: order._id }).lean();
  const pastAttempts = payment
    ? await PaymentAttempt.find({ paymentId: payment._id })
        .sort({ attemptNumber: 1 })
        .lean()
    : [];
  const showPaymentForm = order.status === "AWAITING_PAYMENT";
  let paymentMethods: SubmittablePaymentMethod[] = [];
  if (showPaymentForm) {
    const activeMethods = await PaymentMethod.find({ isActive: true }).sort({ type: 1 }).lean();
    paymentMethods = activeMethods.map((method) => ({
      id: String(method._id),
      type: method.type,
      label: method.label,
      currency: method.currency,
      beneficiaryName: method.beneficiaryName,
      details: method.details,
      instructions: method.instructions,
    }));
  }

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

      {payment ? (
        <PaymentStatusPanel
          payment={{
            id: String(payment._id),
            status: payment.status,
            methodLabel: payment.paymentMethodSnapshot.label,
            transactionReference: payment.transactionReference,
            amountCents: payment.amountCents,
            currency: payment.currency,
            paymentDate: payment.paymentDate,
            notes: payment.notes,
            reviewNote: payment.reviewNote,
          }}
        />
      ) : null}

      {pastAttempts.length > 1 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-neutral-900">Payment history</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {pastAttempts.map((attempt) => (
              <li
                key={String(attempt._id)}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 p-3 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-neutral-900">Attempt #{attempt.attemptNumber}</span>
                  <PaymentStatusBadge status={attempt.status} />
                </div>
                <a
                  href={`/api/payments/${String(payment?._id)}/attempts/${String(attempt._id)}/proof`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-neutral-900 underline underline-offset-2"
                >
                  View proof
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showPaymentForm ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-neutral-900">
            {payment ? "Resubmit your payment" : "Submit your payment"}
          </h3>
          <p className="mt-1 text-sm text-neutral-500">
            Choose a payment method below, complete the transfer, then let us know the details.
          </p>
          <div className="mt-4">
            <PaymentSubmissionForm orderId={String(order._id)} methods={paymentMethods} />
          </div>
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
