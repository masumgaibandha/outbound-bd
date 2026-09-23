import type { Metadata } from "next";

import { getDashboardStats } from "@/lib/agency-admin/leads-repository";
import { SOURCE_LABELS, STATUS_LABELS } from "@/lib/agency-admin/labels";
import { defaultDhakaDateRange } from "@/lib/agency-admin/timezone";
import { parseLeadFilters, type RawSearchParams } from "@/lib/agency-admin/validation";
import type { InquirySource, InquiryStatus } from "@/lib/models/inquiry";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface AdminDashboardPageProps {
  searchParams: Promise<RawSearchParams>;
}

function formatRate(count: number, total: number): string {
  if (total === 0) return "0.0%";
  return `${((count / total) * 100).toFixed(1)}%`;
}

export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
  const resolvedSearchParams = await searchParams;
  const parsed = parseLeadFilters(resolvedSearchParams);
  const defaultRange = defaultDhakaDateRange();
  const from = parsed.from ?? defaultRange.from;
  const to = parsed.to ?? defaultRange.to;

  const stats = await getDashboardStats({ from, to });

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-600">Lead activity for the selected date range (Asia/Dhaka time).</p>

      <form method="GET" className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="from" className="text-xs font-medium text-gray-600">
            From
          </label>
          <input
            id="from"
            type="date"
            name="from"
            defaultValue={from}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="to" className="text-xs font-medium text-gray-600">
            To
          </label>
          <input
            id="to"
            type="date"
            name="to"
            defaultValue={to}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <button type="submit" className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
          Apply
        </button>
        <a href="/admin" className="text-sm text-gray-600 hover:text-blue-600">
          Reset to last 30 days
        </a>
      </form>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total leads" value={String(stats.totalLeads)} testId="total-leads" />
        <StatCard
          label="To call booked or beyond"
          value={`${stats.toCallBookedOrBeyond} (${formatRate(stats.toCallBookedOrBeyond, stats.totalLeads)})`}
        />
        <StatCard label="To won" value={`${stats.toWon} (${formatRate(stats.toWon, stats.totalLeads)})`} />
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4">
          <div className="text-2xl font-bold text-gray-400">Coming soon</div>
          <div className="mt-1 text-xs text-gray-500">Revenue (Round 4B)</div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <BreakdownTable
          title="Leads by source"
          rows={stats.bySource.map((row) => ({
            label: SOURCE_LABELS[row.source as InquirySource] ?? row.source,
            count: row.count,
          }))}
        />
        <BreakdownTable
          title="Leads by status"
          rows={stats.byStatus.map((row) => ({
            label: STATUS_LABELS[row.status as InquiryStatus] ?? row.status,
            count: row.count,
          }))}
        />
        <BreakdownTable
          title="Leads by UTM campaign"
          rows={stats.byUtmCampaign.map((row) => ({ label: row.campaign, count: row.count }))}
          emptyMessage="No UTM campaign data in this range."
        />
        <BreakdownTable
          title="Leads by UTM content"
          rows={stats.byUtmContent.map((row) => ({ label: row.content, count: row.count }))}
          emptyMessage="No UTM content data in this range."
        />
      </div>
    </main>
  );
}

function StatCard({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-2xl font-bold text-gray-900" data-testid={testId}>
        {value}
      </div>
      <div className="mt-1 text-xs text-gray-500">{label}</div>
    </div>
  );
}

function BreakdownTable({
  title,
  rows,
  emptyMessage = "No leads in this range.",
}: {
  title: string;
  rows: { label: string; count: number }[];
  emptyMessage?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">{emptyMessage}</p>
      ) : (
        <ul className="mt-2 divide-y divide-gray-100 text-sm">
          {rows.map((row) => (
            <li key={row.label} className="flex items-center justify-between py-1.5">
              <span className="text-gray-700">{row.label}</span>
              <span className="font-medium text-gray-900">{row.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
