import type { ReactNode } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/lib/session";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/orders", label: "Orders" },
  { href: "/dashboard/campaigns", label: "Campaigns" },
  { href: "/dashboard/leads", label: "Leads" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default async function ClientDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Authoritative, server-side check: any signed-in user (CLIENT or
  // ADMIN) may view the client dashboard.
  const user = await requireUser("/sign-in?redirectTo=/dashboard");

  return (
    <DashboardShell
      title="Client dashboard"
      navItems={NAV_ITEMS}
      userName={user.name}
      userEmail={user.email}
    >
      {children}
    </DashboardShell>
  );
}
