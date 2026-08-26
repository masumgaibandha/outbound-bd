import { PaymentStatusBadge } from "@/components/dashboard/payment-status-badge";
import type { PaymentStatus } from "@/lib/models/payment";
import { formatPriceCents } from "@/lib/pricing-catalog";

export type PaymentStatusView = {
  id: string;
  status: PaymentStatus;
  methodLabel: string;
  transactionReference: string;
  amountCents: number;
  currency: string;
  paymentDate: string | Date;
  notes?: string | null;
  reviewNote?: string | null;
};

export function PaymentStatusPanel({ payment }: { payment: PaymentStatusView }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-sm font-semibold text-neutral-900">Payment</h3>
        <PaymentStatusBadge status={payment.status} />
      </div>

      {payment.status === "REJECTED" || payment.status === "RESUBMISSION_REQUESTED" ? (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <p className="font-medium">
            {payment.status === "REJECTED" ? "This payment was rejected." : "Please resubmit your payment."}
          </p>
          {payment.reviewNote ? <p className="mt-1">{payment.reviewNote}</p> : null}
        </div>
      ) : null}

      {payment.status === "VERIFIED" ? (
        <p className="mt-3 text-sm text-emerald-700">Payment verified — thank you.</p>
      ) : null}

      {payment.status === "PENDING_REVIEW" ? (
        <p className="mt-3 text-sm text-neutral-600">
          We&apos;ve received your payment and it&apos;s being reviewed. We&apos;ll follow up if anything else
          is needed.
        </p>
      ) : null}

      <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-neutral-500">Method</dt>
          <dd className="mt-0.5 text-sm text-neutral-900">{payment.methodLabel}</dd>
        </div>
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
        {payment.notes ? (
          <div className="sm:col-span-2">
            <dt className="text-xs text-neutral-500">Notes</dt>
            <dd className="mt-0.5 text-sm whitespace-pre-wrap text-neutral-900">{payment.notes}</dd>
          </div>
        ) : null}
      </dl>

      <a
        href={`/api/payments/${payment.id}/proof`}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-block text-sm font-medium text-neutral-900 underline underline-offset-2"
      >
        View payment proof
      </a>
    </div>
  );
}
