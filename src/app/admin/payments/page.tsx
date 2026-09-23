import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { PaymentRow } from "@/components/admin/payment-row";
import { PAYMENT_METHOD_LABELS, PAYMENT_TYPE_LABELS } from "@/lib/agency-admin/clients-labels";
import { listClientOptions } from "@/lib/agency-admin/clients-repository";
import { listPaymentsPage } from "@/lib/agency-admin/payments-repository";
import {
  PAYMENTS_PAGE_SIZE,
  PAYMENT_METHOD_VALUES,
  PAYMENT_TYPE_VALUES,
  parsePaymentFilters,
  parsePaymentsPageParam,
  type RawSearchParams,
} from "@/lib/agency-admin/payments-validation";
import { paymentsQueryString } from "@/lib/agency-admin/query";

export const metadata: Metadata = {
  title: "Payments",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface AdminPaymentsPageProps {
  searchParams: Promise<RawSearchParams>;
}

export default async function AdminPaymentsPage({ searchParams }: AdminPaymentsPageProps) {
  const resolvedSearchParams = await searchParams;
  const filters = parsePaymentFilters(resolvedSearchParams);
  const page = parsePaymentsPageParam(resolvedSearchParams.page);

  const [{ payments, totalCount }, clientOptions] = await Promise.all([
    listPaymentsPage(filters, page, PAYMENTS_PAGE_SIZE),
    listClientOptions(),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAYMENTS_PAGE_SIZE));

  const csvHref = `/admin/payments/export?${paymentsQueryString(filters)}`;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Payments</h1>
        <a
          href={csvHref}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Download CSV
        </a>
      </div>

      <form
        method="GET"
        className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4"
      >
        <Field label="From">
          <input
            type="date"
            name="from"
            defaultValue={filters.from ?? ""}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="To">
          <input
            type="date"
            name="to"
            defaultValue={filters.to ?? ""}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="Client">
          <select
            name="clientId"
            defaultValue={filters.clientId ?? ""}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {clientOptions.map((client) => (
              <option key={client.id} value={client.id}>
                {client.company}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Method">
          <select
            name="method"
            defaultValue={filters.method ?? ""}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {PAYMENT_METHOD_VALUES.map((method) => (
              <option key={method} value={method}>
                {PAYMENT_METHOD_LABELS[method]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Type">
          <select
            name="type"
            defaultValue={filters.type ?? ""}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {PAYMENT_TYPE_VALUES.map((type) => (
              <option key={type} value={type}>
                {PAYMENT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </Field>
        <button type="submit" className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
          Filter
        </button>
        <Link href="/admin/payments" className="text-sm text-gray-600 hover:text-blue-600">
          Clear
        </Link>
      </form>

      <p className="mt-4 text-sm text-gray-600">
        {totalCount} {totalCount === 1 ? "payment" : "payments"} found.
      </p>

      {payments.length === 0 ? (
        <p className="mt-6 rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
          No payments match these filters.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {payments.map((payment) => (
            <PaymentRow key={payment.id} payment={payment} />
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-gray-600">
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-3">
          {page > 1 ? (
            <Link
              href={`/admin/payments?${paymentsQueryString(filters, { page: String(page - 1) })}`}
              className="text-blue-700 hover:underline"
            >
              Previous
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link
              href={`/admin/payments?${paymentsQueryString(filters, { page: String(page + 1) })}`}
              className="text-blue-700 hover:underline"
            >
              Next
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      {children}
    </div>
  );
}
