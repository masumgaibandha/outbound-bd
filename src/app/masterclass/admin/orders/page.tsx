import type { Metadata } from "next";

import { OrderRow } from "@/components/masterclass/admin/OrderRow";
import { UnauthorizedAdminError, requireMasterclassAdmin } from "@/lib/masterclass/admin-auth";
import { countOrdersByStatus, listOrdersForReview } from "@/lib/masterclass/payment-orders-repository";
import { countEnrolledRegistrations, countTotalRegistrations } from "@/lib/masterclass/registrations-repository";

/* Never indexed, never in the sitemap — protection here is belt-and-suspenders alongside `proxy.ts`'s Basic Auth. */
export const metadata: Metadata = {
  title: "Payment review",
  robots: { index: false, follow: false },
};

/* Every request must see the current REVIEW queue — never statically cached. */
export const dynamic = "force-dynamic";

interface AdminOrdersPageProps {
  searchParams: Promise<{ cursor?: string }>;
}

/**
 * Ported from the MasumDev masterclass source. Deliberately dependency-free
 * from the main site's Tailwind/HeroUI design system (plain inline styles +
 * one small scoped `<style>` block) — this is a small, isolated operator
 * tool, not a public-facing page, so it doesn't need to share the agency
 * site's visual system.
 *
 * This page renders student names, emails, phone numbers, and transaction
 * IDs — sensitive enough that it independently re-verifies the caller here
 * too, not just for the mutations. `proxy.ts` already blocks an
 * unauthenticated GET to this exact path, so in normal operation this never
 * throws; it exists so a future change to the middleware matcher (or any
 * other way this component could end up rendered) can never accidentally
 * expose this data without going through the same check the mutations use.
 */
export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
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

  const { cursor } = await searchParams;
  const [{ orders, nextCursor }, totalRegistrations, enrolledCount, reviewCount, rejectedCount] =
    await Promise.all([
      listOrdersForReview(cursor),
      countTotalRegistrations(),
      countEnrolledRegistrations(),
      countOrdersByStatus("REVIEW"),
      countOrdersByStatus("REJECTED"),
    ]);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 880, margin: "0 auto", padding: "2.5rem 1.25rem" }}>
      {/*
       * Defined once here (the page, rendered once) rather than inside
       * OrderRow (rendered once per order) so N orders don't produce N
       * duplicate <style> tags. Plain CSS, not Tailwind — this admin island
       * deliberately stays dependency-free from the main site's design
       * system (see OrderRow.tsx's own doc comment); hover/focus states
       * need real pseudo-classes, which inline `style` objects can't
       * express, hence a small scoped stylesheet instead of inline styles
       * for just the interactive controls.
       */}
      <style>{`
        .mc-admin-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          border-radius: 8px;
          padding: 0.6rem 1.15rem;
          font-size: 0.9rem;
          font-weight: 600;
          font-family: inherit;
          border: 1.5px solid transparent;
          cursor: pointer;
          transition: background-color 0.15s ease, opacity 0.15s ease;
        }
        .mc-admin-btn:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }
        .mc-admin-btn-approve {
          background: #15803d;
          color: #fff;
        }
        .mc-admin-btn-approve:hover:not(:disabled) {
          background: #166534;
        }
        .mc-admin-btn-approve:focus-visible {
          outline: 2px solid #15803d;
          outline-offset: 2px;
        }
        .mc-admin-btn-reject {
          background: #b91c1c;
          color: #fff;
        }
        .mc-admin-btn-reject:hover:not(:disabled) {
          background: #991b1b;
        }
        .mc-admin-btn-reject:focus-visible {
          outline: 2px solid #b91c1c;
          outline-offset: 2px;
        }
        .mc-admin-btn-retry {
          background: #fff;
          color: #92400e;
          border-color: #d97706;
        }
        .mc-admin-btn-retry:hover:not(:disabled) {
          background: #fffbeb;
        }
        .mc-admin-btn-retry:focus-visible {
          outline: 2px solid #d97706;
          outline-offset: 2px;
        }
        .mc-admin-input {
          border: 1px solid #d8d8d0;
          border-radius: 8px;
          padding: 0.6rem 0.8rem;
          font-size: 0.9rem;
          font-family: inherit;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .mc-admin-input:focus-visible,
        .mc-admin-input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
        }
        .mc-admin-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }
        .mc-admin-summary-card {
          border: 1px solid #d8d8d0;
          border-radius: 8px;
          padding: 0.75rem 1rem;
        }
        .mc-admin-summary-value {
          font-size: 1.5rem;
          font-weight: 700;
          font-variant-numeric: tabular-nums lining-nums;
        }
        .mc-admin-summary-label {
          font-size: 0.78rem;
          color: #666;
          margin-top: 0.15rem;
        }
      `}</style>
      <h1 style={{ fontSize: "1.4rem", marginBottom: "0.3rem" }}>Masterclass — payments awaiting review</h1>
      <p style={{ color: "#666", marginBottom: "1rem", fontSize: "0.9rem" }}>
        Oldest submissions first. Approving sets the order to PAID, enrolls the student, and (best-effort) sends
        the confirmation email and a Meta Purchase event. Rejecting sends the student a best-effort rejection email.
      </p>

      {/*
       * Compact summary counts, derived entirely from document status —
       * never from a public reference's shape or a count of generated IDs
       * (random registration references reveal nothing about volume by
       * themselves; this is the actual, intentional way to see totals).
       */}
      <div className="mc-admin-summary">
        <div className="mc-admin-summary-card">
          <div className="mc-admin-summary-value">{totalRegistrations}</div>
          <div className="mc-admin-summary-label">Total registrations</div>
        </div>
        <div className="mc-admin-summary-card">
          <div className="mc-admin-summary-value">{reviewCount}</div>
          <div className="mc-admin-summary-label">Awaiting payment review</div>
        </div>
        <div className="mc-admin-summary-card">
          <div className="mc-admin-summary-value">{enrolledCount}</div>
          <div className="mc-admin-summary-label">Enrolled / paid students</div>
        </div>
        <div className="mc-admin-summary-card">
          <div className="mc-admin-summary-value">{rejectedCount}</div>
          <div className="mc-admin-summary-label">Rejected payments</div>
        </div>
      </div>

      {orders.length === 0 ? <p>Nothing waiting for review right now.</p> : null}

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {orders.map((order) => (
          <OrderRow key={order.publicOrderRef} order={order} />
        ))}
      </div>

      {nextCursor ? (
        <p style={{ marginTop: "1.5rem" }}>
          <a href={`/masterclass/admin/orders?cursor=${encodeURIComponent(nextCursor)}`}>Next page →</a>
        </p>
      ) : null}
    </main>
  );
}
