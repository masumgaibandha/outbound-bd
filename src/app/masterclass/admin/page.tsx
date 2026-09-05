import type { Metadata } from "next";

import { countOrdersByStatus } from "@/lib/masterclass/payment-orders-repository";
import {
  countEnrolledRegistrations,
  countRegistrationsByStatus,
  countTotalRegistrations,
} from "@/lib/masterclass/registrations-repository";
import { countStudents } from "@/lib/masterclass/students-repository";

export const metadata: Metadata = {
  title: "Masterclass admin — Dashboard",
  robots: { index: false, follow: false },
};

/* Every request must see current counts — never statically cached. */
export const dynamic = "force-dynamic";

const cardStyle: React.CSSProperties = { border: "1px solid #d8d8d0", borderRadius: 8, padding: "0.75rem 1rem" };
const valueStyle: React.CSSProperties = { fontSize: "1.5rem", fontWeight: 700, fontVariantNumeric: "tabular-nums lining-nums" };
const labelStyle: React.CSSProperties = { fontSize: "0.78rem", color: "#666", marginTop: "0.15rem" };

/**
 * Every count here is a real database count of the actual, existing status
 * values (`RegistrationStatus`/`PaymentOrderStatus` — see
 * `types/masterclass-persistence.ts`) — never inferred from a public
 * reference's shape or a generated-ID counter.
 */
export default async function MasterclassAdminDashboardPage() {
  const [
    uniqueStudents,
    totalRegistrations,
    enrolledCount,
    pendingPaymentCount,
    reviewCount,
    rejectedCount,
    paidCount,
  ] = await Promise.all([
    countStudents(),
    countTotalRegistrations(),
    countEnrolledRegistrations(),
    countRegistrationsByStatus("PENDING_PAYMENT"),
    countOrdersByStatus("REVIEW"),
    countOrdersByStatus("REJECTED"),
    countOrdersByStatus("PAID"),
  ]);

  const cards: { label: string; value: number }[] = [
    { label: "Unique students", value: uniqueStudents },
    { label: "Total registrations/enrollments", value: totalRegistrations },
    { label: "Enrolled", value: enrolledCount },
    { label: "Pending payment", value: pendingPaymentCount },
    { label: "Awaiting payment review", value: reviewCount },
    { label: "Rejected", value: rejectedCount },
    { label: "Paid orders", value: paidCount },
  ];

  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: "2.5rem 1.25rem" }}>
      <h1 style={{ fontSize: "1.4rem", marginBottom: "1.25rem" }}>Dashboard</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem" }}>
        {cards.map((card) => (
          <div key={card.label} style={cardStyle}>
            <div style={valueStyle}>{card.value}</div>
            <div style={labelStyle}>{card.label}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
