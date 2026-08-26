import type { Metadata } from "next";
import Link from "next/link";

import { PaymentStatusBadge } from "@/components/dashboard/payment-status-badge";
import "@/lib/models/order"; // ensure Order is registered for populate()
import { Payment } from "@/lib/models/payment";
import { connectToDatabase } from "@/lib/mongoose";

export const metadata: Metadata = {
  title: "Payments",
};

type AdminPaymentsPageProps = {
  searchParams: Promise<{ status?: string }>;
};

const TABS = [
  { value: "PENDING_REVIEW", label: "Pending review" },
  { value: "", label: "All" },
] as const;

export default async function AdminPaymentsPage({ searchParams }: AdminPaymentsPageProps) {
  const { status } = await searchParams;
  const activeStatus = status === "" || status === undefined ? "PENDING_REVIEW" : status;

  await connectToDatabase();
  const filter = activeStatus ? { status: activeStatus } : {};
  const payments = await Payment.find(filter)
    .sort({ createdAt: -1 })
    .populate("orderId", "orderNumber company")
    .lean();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Payments</h2>
        <p className="text-sm text-neutral-500">Review submitted payment proofs.</p>
      </div>

      <div className="flex gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.label}
            href={tab.value ? `/admin/payments?status=${tab.value}` : "/admin/payments?status="}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              activeStatus === tab.value
                ? "bg-neutral-900 text-white"
                : "border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {payments.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center">
          <p className="text-sm text-neutral-500">No payments here.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <ul className="divide-y divide-neutral-200">
            {payments.map((payment) => {
              const order = payment.orderId as unknown as
                | { _id: unknown; orderNumber: string; company: string }
                | null;
              return (
                <li key={String(payment._id)}>
                  <Link
                    href={`/admin/payments/${String(payment._id)}`}
                    className="flex flex-col gap-2 p-4 transition-colors hover:bg-neutral-50 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                  >
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        {order?.company ?? "—"} &middot; {order?.orderNumber ?? "—"}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {payment.paymentMethodSnapshot.label} &middot; {payment.transactionReference}
                      </p>
                    </div>
                    <PaymentStatusBadge status={payment.status} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
