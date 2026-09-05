import type { ReactNode } from "react";
import Link from "next/link";

import { UnauthorizedAdminError, requireMasterclassAdmin } from "@/lib/masterclass/admin-auth";

/**
 * Shared shell for every `/masterclass/admin/**` page — Dashboard,
 * Students, Enrollments, and Payment Reviews (`/orders`, preserved exactly
 * as its own file/behavior; this layout only adds the surrounding nav
 * chrome around it). Checking `requireMasterclassAdmin()` once here covers
 * every read-only child page; `orders/page.tsx` additionally re-checks
 * itself (unchanged, pre-existing behavior) — a harmless, deliberate
 * belt-and-suspenders duplication for that one route, not a security gap
 * for the others. `proxy.ts`'s wildcard matcher (`/masterclass/admin/:path*`)
 * already covers every route under this layout with zero middleware change.
 *
 * Programs/Batches/Sessions/Emails are shown as plain, non-interactive text
 * (never an `<a>`/`Link`) — Phase 1 explicitly does not build those pages,
 * and a broken link would be worse than no link.
 */
export default async function MasterclassAdminLayout({ children }: { children: ReactNode }) {
  try {
    await requireMasterclassAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedAdminError) {
      return (
        <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 480, margin: "4rem auto", padding: "0 1.25rem" }}>
          <h1 style={{ fontSize: "1.2rem" }}>Not authorized</h1>
          <p style={{ color: "#666", fontSize: "0.9rem" }}>Sign in with valid admin credentials to view this page.</p>
        </main>
      );
    }
    throw error;
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <nav
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "1.25rem",
          padding: "1rem 1.25rem",
          borderBottom: "1px solid #d8d8d0",
          fontSize: "0.9rem",
        }}
      >
        <strong style={{ marginRight: "0.5rem" }}>Masterclass Admin</strong>
        <Link href="/masterclass/admin">Dashboard</Link>
        <Link href="/masterclass/admin/students">Students</Link>
        <Link href="/masterclass/admin/enrollments">Enrollments</Link>
        <Link href="/masterclass/admin/orders">Payment Reviews</Link>
        <span style={{ color: "#aaa" }} title="Coming in a later phase">
          Programs
        </span>
        <span style={{ color: "#aaa" }} title="Coming in a later phase">
          Batches
        </span>
        <span style={{ color: "#aaa" }} title="Coming in a later phase">
          Sessions
        </span>
        <span style={{ color: "#aaa" }} title="Coming in a later phase">
          Emails
        </span>
      </nav>
      {children}
    </div>
  );
}
