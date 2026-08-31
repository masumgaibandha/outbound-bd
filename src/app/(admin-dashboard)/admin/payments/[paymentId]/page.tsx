import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";

import { PaymentMethodDetails } from "@/components/dashboard/payment-method-details";
import { PaymentStatusBadge } from "@/components/dashboard/payment-status-badge";
import { PaymentMatchBadge } from "@/components/dashboard/payment-match-badge";
import { PaymentReviewActions } from "@/components/admin/payment-review-actions";
import { Order } from "@/lib/models/order";
import { Payment, type PaymentHistoryEntry } from "@/lib/models/payment";
import { PaymentAttempt } from "@/lib/models/payment-attempt";
import { buildCurrentAttemptView, toAttemptHistoryRow } from "@/lib/payment-attempt-view";
import { connectToDatabase } from "@/lib/mongoose";
import { formatPriceCents } from "@/lib/pricing-catalog";

export const metadata: Metadata = {
  title: "Payment review",
};

type AdminPaymentDetailPageProps = {
  params: Promise<{ paymentId: string }>;
};

function formatAmount(amountCents: number, currency: string) {
  return currency === "USD"
    ? formatPriceCents(amountCents)
    : `${(amountCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export default async function AdminPaymentDetailPage({ params }: AdminPaymentDetailPageProps) {
  const { paymentId } = await params;
  if (!isValidObjectId(paymentId)) {
    notFound();
  }

  await connectToDatabase();
  const payment = await Payment.findById(paymentId).lean();
  if (!payment) {
    notFound();
  }

  const order = await Order.findById(payment.orderId).lean();
  if (!order) {
    notFound();
  }

  const currentAttempt = payment.currentAttemptId
    ? await PaymentAttempt.findById(payment.currentAttemptId).lean()
    : null;
  const view = buildCurrentAttemptView(payment, currentAttempt, order.catalog);

  const attempts = await PaymentAttempt.find({ paymentId: payment._id })
    .sort({ attemptNumber: 1 })
    .lean();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/payments" className="text-sm text-neutral-500 hover:text-neutral-700">
          &larr; All payments
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-neutral-900">
            {order.company} &middot; {order.orderNumber}
          </h2>
          <PaymentStatusBadge status={view.status} />
          <PaymentMatchBadge result={view.matchResult} />
        </div>
        {view.attemptNumber > 1 ? (
          <p className="mt-1 text-sm text-neutral-500">Attempt #{view.attemptNumber}</p>
        ) : null}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-neutral-900">Expected vs. submitted</h3>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-neutral-500">Expected</dt>
            <dd className="mt-0.5 text-sm text-neutral-900">
              {formatAmount(view.expectedAmountCents, view.expectedCurrency)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Submitted</dt>
            <dd className="mt-0.5 text-sm text-neutral-900">{formatAmount(view.amountCents, view.currency)}</dd>
          </div>
        </dl>
        {view.matchResult !== "MATCH" ? (
          <p className="mt-3 text-sm text-amber-800">
            {view.matchResult === "CURRENCY_MISMATCH"
              ? "Submitted currency doesn't match the order's expected currency."
              : view.matchResult === "UNDERPAID"
                ? "Submitted amount is less than expected."
                : "Submitted amount is more than expected."}
          </p>
        ) : null}
        {view.overrideReason ? (
          <p className="mt-3 text-sm text-neutral-700">
            <span className="font-medium text-neutral-900">Override reason:</span> {view.overrideReason}
          </p>
        ) : null}
      </div>

      {view.status === "PENDING_REVIEW" ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-neutral-900">Review</h3>
          <PaymentReviewActions paymentId={String(payment._id)} matchResult={view.matchResult} />
        </div>
      ) : view.reviewNote ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <p className="text-sm font-medium text-neutral-900">Review note</p>
          <p className="mt-1 text-sm text-neutral-700">{view.reviewNote}</p>
        </div>
      ) : null}

      <div className="rounded-lg border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-neutral-900">Submitted payment</h3>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-neutral-500">Amount</dt>
            <dd className="mt-0.5 text-sm text-neutral-900">{formatAmount(view.amountCents, view.currency)}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Reference</dt>
            <dd className="mt-0.5 text-sm text-neutral-900">{view.transactionReference}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Payment date</dt>
            <dd className="mt-0.5 text-sm text-neutral-900">
              {new Date(view.paymentDate).toLocaleDateString("en-US")}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Submitted</dt>
            <dd className="mt-0.5 text-sm text-neutral-900">
              {new Date(view.createdAt).toLocaleString("en-US")}
            </dd>
          </div>
          {view.notes ? (
            <div className="sm:col-span-2">
              <dt className="text-xs text-neutral-500">Client notes</dt>
              <dd className="mt-0.5 text-sm whitespace-pre-wrap text-neutral-900">{view.notes}</dd>
            </div>
          ) : null}
        </dl>
        <a
          href={
            view.attemptId
              ? `/api/payments/${String(payment._id)}/attempts/${view.attemptId}/proof`
              : `/api/payments/${String(payment._id)}/proof`
          }
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block text-sm font-medium text-neutral-900 underline underline-offset-2"
        >
          View payment proof
        </a>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-900">Paid into</h3>
        <PaymentMethodDetails method={view.paymentMethodSnapshot} />
      </div>

      {attempts.length > 1 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-neutral-900">Payment attempts</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {attempts.map((attempt) => {
              const row = toAttemptHistoryRow(attempt);
              return (
                <li
                  key={row.attemptId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 p-3 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-neutral-900">Attempt #{row.attemptNumber}</span>
                    <span className="text-neutral-500">{formatAmount(row.amountCents, row.currency)}</span>
                    <PaymentStatusBadge status={row.status} />
                    <PaymentMatchBadge result={row.matchResult} />
                  </div>
                  <a
                    href={`/api/payments/${String(payment._id)}/attempts/${row.attemptId}/proof`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-neutral-900 underline underline-offset-2"
                  >
                    View proof
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {payment.history.length > 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-neutral-900">History</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {payment.history.map((entry: PaymentHistoryEntry, index: number) => (
              <li key={index} className="text-sm text-neutral-700">
                <span className="font-medium text-neutral-900">{entry.status}</span>
                {" — "}
                {entry.actorRole.toLowerCase()} &middot; {new Date(entry.at).toLocaleString("en-US")}
                {entry.reason ? <span className="block text-neutral-500">{entry.reason}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
