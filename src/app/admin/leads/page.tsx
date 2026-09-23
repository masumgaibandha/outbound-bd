import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { listLeadsPage } from "@/lib/agency-admin/leads-repository";
import { SOURCE_LABELS, STATUS_LABELS, STATUS_VALUES, budgetLabel, serviceOrNeedLabel } from "@/lib/agency-admin/labels";
import { leadsQueryString } from "@/lib/agency-admin/query";
import { utcInstantToDhakaDateOnly } from "@/lib/agency-admin/timezone";
import {
  LEADS_PAGE_SIZE,
  parseLeadFilters,
  parseLeadsPageParam,
  type RawSearchParams,
} from "@/lib/agency-admin/validation";

export const metadata: Metadata = {
  title: "Leads",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface AdminLeadsPageProps {
  searchParams: Promise<RawSearchParams>;
}

export default async function AdminLeadsPage({ searchParams }: AdminLeadsPageProps) {
  const resolvedSearchParams = await searchParams;
  const filters = parseLeadFilters(resolvedSearchParams);
  const page = parseLeadsPageParam(resolvedSearchParams.page);

  const { leads, totalCount } = await listLeadsPage(filters, page, LEADS_PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(totalCount / LEADS_PAGE_SIZE));

  const csvHref = `/admin/leads/export?${leadsQueryString(filters)}`;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Leads</h1>
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
        <Field label="Status">
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {STATUS_VALUES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Source">
          <select
            name="source"
            defaultValue={filters.source ?? ""}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            <option value="contact">Contact form</option>
            <option value="agencies-landing">Agencies landing page</option>
          </select>
        </Field>
        <Field label="Search">
          <input
            type="text"
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="Name, email, or website"
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
        </Field>
        <button type="submit" className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
          Filter
        </button>
        <Link href="/admin/leads" className="text-sm text-gray-600 hover:text-blue-600">
          Clear
        </Link>
      </form>

      <p className="mt-4 text-sm text-gray-600">
        {totalCount} {totalCount === 1 ? "lead" : "leads"} found.
      </p>

      {leads.length === 0 ? (
        <p className="mt-6 rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
          No leads match these filters.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Website</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Service or need</th>
                <th className="px-3 py-2">Budget</th>
                <th className="px-3 py-2">Active clients</th>
                <th className="px-3 py-2">UTM campaign</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                    {utcInstantToDhakaDateOnly(lead.createdAt)}
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/leads/${lead.id}`} className="font-medium text-blue-700 hover:underline">
                      {lead.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-gray-700">{lead.email}</td>
                  <td className="max-w-[200px] truncate px-3 py-2 text-gray-700">{lead.website}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-700">{SOURCE_LABELS[lead.source]}</td>
                  <td className="px-3 py-2 text-gray-700">{serviceOrNeedLabel(lead.source, lead.service, lead.need)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-700">{budgetLabel(lead.budgetRange)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-700">{lead.activeClients ?? ""}</td>
                  <td className="px-3 py-2 text-gray-700">{lead.utmCampaign ?? ""}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-700">{STATUS_LABELS[lead.status]}</td>
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
              href={`/admin/leads?${leadsQueryString(filters, { page: String(page - 1) })}`}
              className="text-blue-700 hover:underline"
            >
              Previous
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link
              href={`/admin/leads?${leadsQueryString(filters, { page: String(page + 1) })}`}
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
