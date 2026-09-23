import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { CLIENT_PLAN_LABELS, CLIENT_STATUS_LABELS } from "@/lib/agency-admin/clients-labels";
import { listClientsPage } from "@/lib/agency-admin/clients-repository";
import {
  CLIENTS_PAGE_SIZE,
  CLIENT_PLAN_VALUES,
  CLIENT_STATUS_VALUES,
  parseClientFilters,
  parseClientsPageParam,
  type RawSearchParams,
} from "@/lib/agency-admin/clients-validation";
import { formatCents } from "@/lib/agency-admin/money";
import { clientsQueryString } from "@/lib/agency-admin/query";
import { utcInstantToDhakaDateOnly } from "@/lib/agency-admin/timezone";

export const metadata: Metadata = {
  title: "Clients",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface AdminClientsPageProps {
  searchParams: Promise<RawSearchParams>;
}

export default async function AdminClientsPage({ searchParams }: AdminClientsPageProps) {
  const resolvedSearchParams = await searchParams;
  const filters = parseClientFilters(resolvedSearchParams);
  const page = parseClientsPageParam(resolvedSearchParams.page);

  const { clients, totalCount } = await listClientsPage(filters, page, CLIENTS_PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(totalCount / CLIENTS_PAGE_SIZE));

  const csvHref = `/admin/clients/export?${clientsQueryString(filters)}`;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Clients</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/clients/new"
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add client
          </Link>
          <a
            href={csvHref}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Download CSV
          </a>
        </div>
      </div>

      <form
        method="GET"
        className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4"
      >
        <Field label="Status">
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {CLIENT_STATUS_VALUES.map((status) => (
              <option key={status} value={status}>
                {CLIENT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Plan">
          <select
            name="plan"
            defaultValue={filters.plan ?? ""}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {CLIENT_PLAN_VALUES.map((plan) => (
              <option key={plan} value={plan}>
                {CLIENT_PLAN_LABELS[plan]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Search">
          <input
            type="text"
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="Name, company, or email"
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
        </Field>
        <button type="submit" className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
          Filter
        </button>
        <Link href="/admin/clients" className="text-sm text-gray-600 hover:text-blue-600">
          Clear
        </Link>
      </form>

      <p className="mt-4 text-sm text-gray-600">
        {totalCount} {totalCount === 1 ? "client" : "clients"} found.
      </p>

      {clients.length === 0 ? (
        <p className="mt-6 rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
          No clients match these filters.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2">Company</th>
                <th className="px-3 py-2">Contact name</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Monthly amount</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Start date</th>
                <th className="px-3 py-2">Next billing date</th>
                <th className="px-3 py-2">Collected to date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <Link href={`/admin/clients/${client.id}`} className="font-medium text-blue-700 hover:underline">
                      {client.company}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-gray-700">{client.name}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-700">{CLIENT_PLAN_LABELS[client.plan]}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-700">{formatCents(client.monthlyAmountCents)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-700">{CLIENT_STATUS_LABELS[client.status]}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-700">{utcInstantToDhakaDateOnly(client.startDate)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-700">{client.nextBillingDate ?? "N/A"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-700">{formatCents(client.amountCollectedToDateCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-gray-600">
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-3">
          {page > 1 ? (
            <Link
              href={`/admin/clients?${clientsQueryString(filters, { page: String(page - 1) })}`}
              className="text-blue-700 hover:underline"
            >
              Previous
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link
              href={`/admin/clients?${clientsQueryString(filters, { page: String(page + 1) })}`}
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
