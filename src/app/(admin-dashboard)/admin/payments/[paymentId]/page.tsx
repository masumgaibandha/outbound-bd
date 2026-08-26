import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";

import { PaymentMethodDetails } from "@/components/dashboard/payment-method-details";
import { PaymentStatusBadge } from "@/components/dashboard/payment-status-badge";
import { PaymentReviewActions } from "@/components/admin/payment-review-actions";
import { Order } from "@/lib/models/order";
import { Payment, type PaymentHistoryEntry } from "@/lib/models/payment";
import { connectToDatabase } from "@/lib/mongoose";
import { formatPriceCents } from "@/lib/pricing-catalog";

export const metadata: Metadata = {
  title: "Payment review",
};

type AdminPaymentDetailPageProps = {
  params: Promise<{ paymentId: string }>;
};

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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/payments" className="text-sm text-neutral-500 hover:text-neutral-700">
          &larr; All payments
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-neutral-900">
            {order?.company ?? "—"} &middot; {order?.orderNumber ?? "—"}
          </h2>
          <PaymentStatusBadge status={payment.status} />
        </div>
      </div>

      {payment.status === "PENDING_REVIEW" ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-neutral-900">Review</h3>
          <PaymentReviewActions paymentId={String(payment._id)} />
        </div>
      ) : payment.reviewNote ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <p className="text-sm font-medium text-neutral-900">Review note</p>
          <p className="mt-1 text-sm text-neutral-700">{payment.reviewNote}</p>
        </div>
      ) : null}

      <div className="rounded-lg border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-neutral-900">Submitted payment</h3>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-neutral-500">Amount</dt>
            <dd className="mt-0.5 text-sm text-neutral-900">
              {payment.currency === "USD"
                ? formatPriceCents(payment.amountCents)
                : `${(payment.amountCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${payment.currency}`}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Reference</dt>
            <dd className="mt-0.5 text-sm text-neutral-900">{payment.transactionReference}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Payment date</dt>
            <dd className="mt-0.5 text-sm text-neutral-900">
              {new Date(payment.paymentDate).toLocaleDateString("en-US")}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Submitted</dt>
            <dd className="mt-0.5 text-sm text-neutral-900">
              {new Date(payment.createdAt).toLocaleString("en-US")}
            </dd>
          </div>
          {payment.notes ? (
            <div className="sm:col-span-2">
              <dt className="text-xs text-neutral-500">Client notes</dt>
              <dd className="mt-0.5 text-sm whitespace-pre-wrap text-neutral-900">{payment.notes}</dd>
            </div>
          ) : null}
        </dl>
        <a
          href={`/api/payments/${String(payment._id)}/proof`}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block text-sm font-medium text-neutral-900 underline underline-offset-2"
        >
          View payment proof
        </a>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-900">Paid into</h3>
        <PaymentMethodDetails method={payment.paymentMethodSnapshot} />
      </div>

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
