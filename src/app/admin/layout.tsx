import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

import { UnauthorizedAgencyAdminError, requireAgencyAdmin } from "@/lib/agency-admin/admin-auth";

/**
 * Shared shell for every `/admin/**` page — the Round 4A agency leads admin.
 * Fully separate from `/masterclass/admin` (own credentials, own layout, own
 * rate-limit scope — see CLAUDE.md's "Round 4A" note). Deliberately plain
 * Tailwind utilities, not the public site's branded HeroUI components, per
 * that same decision: this is an internal operator tool, not a marketing
 * page, and must never load the Meta Pixel or the consent banner — neither
 * is imported anywhere in this tree.
 *
 * `requireAgencyAdmin()` here covers every child page's initial render;
 * every mutating Server Action re-checks independently too (see
 * `leads/actions.ts`) — belt-and-suspenders, same pattern as the masterclass
 * admin.
 */
export const metadata: Metadata = {
  title: "Agency Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function NotAuthorized() {
  return (
    <main className="mx-auto max-w-md px-5 py-16 font-sans">
      <h1 className="text-lg font-semibold text-gray-900">Not authorized</h1>
      <p className="mt-1 text-sm text-gray-600">Sign in with valid admin credentials to view this page.</p>
    </main>
  );
}

export default async function AgencyAdminLayout({ children }: { children: ReactNode }) {
  try {
    await requireAgencyAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedAgencyAdminError) {
      return <NotAuthorized />;
    }
    throw error;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-gray-200 bg-white px-4 py-3 text-sm">
        <strong className="mr-1">Agency Admin</strong>
        <Link href="/admin" className="text-gray-700 hover:text-blue-600">
          Dashboard
        </Link>
        <Link href="/admin/leads" className="text-gray-700 hover:text-blue-600">
          Leads
        </Link>
      </nav>
      {children}
    </div>
  );
}
