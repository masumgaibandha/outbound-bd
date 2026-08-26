import type { ReactNode } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireRole } from "@/lib/session";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/campaigns", label: "Campaigns" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/payment-methods", label: "Payment methods" },
  { href: "/admin/team", label: "Team" },
];

export default async function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Authoritative, server-side check: only ADMIN may view this group.
  // Any other authenticated user is redirected to their own dashboard.
  const user = await requireRole(["ADMIN"], {
    signInRedirect: "/sign-in?redirectTo=/admin",
    unauthorizedRedirect: "/dashboard",
  });

  return (
    <DashboardShell
      title="Admin dashboard"
      navItems={NAV_ITEMS}
      userName={user.name}
      userEmail={user.email}
    >
      {children}
    </DashboardShell>
  );
}
