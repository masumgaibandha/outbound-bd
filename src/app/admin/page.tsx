import type { Metadata } from "next";

import { getClientCounts, getCurrentMrrCents } from "@/lib/agency-admin/clients-repository";
import { getDashboardStats } from "@/lib/agency-admin/leads-repository";
import { SOURCE_LABELS, STATUS_LABELS } from "@/lib/agency-admin/labels";
import { averageCents, formatCents } from "@/lib/agency-admin/money";
import { getMonthlyCollectedSeries, getRevenueByType } from "@/lib/agency-admin/payments-repository";
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

  const [stats, revenueByType, mrrCents, clientCounts, monthlySeries] = await Promise.all([
    getDashboardStats({ from, to }),
    getRevenueByType({ from, to }),
    getCurrentMrrCents(),
    getClientCounts(),
    getMonthlyCollectedSeries(6),
  ]);
  const averageRevenuePerActiveClientCents = averageCents(mrrCents, clientCounts.active);

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
        <StatCard label="Average revenue per active client" value={formatCents(averageRevenuePerActiveClientCents)} />
      </div>

      <h2 className="mt-8 text-lg font-semibold">Revenue</h2>
      <p className="mt-1 text-sm text-gray-600">
        Collected is real cash received (from payments); MRR is committed recurring revenue from active clients, not
        cash in hand. The two are never the same number and should not be read as interchangeable.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Collected in range (setup)"
          value={formatCents(revenueByType.setupCents)}
          testId="collected-setup"
        />
        <StatCard
          label="Collected in range (monthly)"
          value={formatCents(revenueByType.monthlyCents)}
          testId="collected-monthly"
        />
        <StatCard
          label="Collected in range (total)"
          value={formatCents(revenueByType.totalCents)}
          testId="collected-total"
        />
        <StatCard
          label="Current MRR (committed, not collected)"
          value={formatCents(mrrCents)}
          testId="current-mrr"
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <StatCard label="Active clients" value={String(clientCounts.active)} testId="clients-active" />
        <StatCard label="Paused clients" value={String(clientCounts.paused)} testId="clients-paused" />
        <StatCard label="Ended clients" value={String(clientCounts.ended)} testId="clients-ended" />
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-900">Collected revenue, last 6 months</h3>
        <p className="mt-1 text-xs text-gray-500">Always the last 6 calendar months (Asia/Dhaka), independent of the date range above.</p>
        <ul className="mt-2 divide-y divide-gray-100 text-sm">
          {monthlySeries.map((row) => (
            <li key={row.month} className="flex items-center justify-between py-1.5">
              <span className="text-gray-700">{row.month}</span>
              <span className="font-medium text-gray-900">{formatCents(row.collectedCents)}</span>
            </li>
          ))}
        </ul>
      </div>

      <h2 className="mt-8 text-lg font-semibold">Leads</h2>

      <div className="mt-3 grid gap-6 sm:grid-cols-2">
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
