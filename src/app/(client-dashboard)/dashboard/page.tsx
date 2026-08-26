import type { Metadata } from "next";

import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Dashboard",
};

const STATS = [
  { label: "Active campaigns", value: "—" },
  { label: "Leads contacted", value: "—" },
  { label: "Replies", value: "—" },
  { label: "Meetings booked", value: "—" },
];

export default async function ClientDashboardPage() {
  const user = await requireUser("/sign-in?redirectTo=/dashboard");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">
          Welcome back, {user.name.split(" ")[0]}
        </h2>
        <p className="text-sm text-neutral-500">
          Here&apos;s an overview of your outbound activity.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-neutral-200 bg-white p-5"
          >
            <p className="text-sm text-neutral-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold text-neutral-900">
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
