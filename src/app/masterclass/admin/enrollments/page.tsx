import type { Metadata } from "next";

import { ADMIN_PAGE_SIZE, parsePageParam } from "@/lib/masterclass/pagination";
import { listEnrollmentsPage } from "@/lib/masterclass/registrations-repository";

export const metadata: Metadata = {
  title: "Masterclass admin — Enrollments",
  robots: { index: false, follow: false },
};

/* Renders real names/emails/phones — must never be served from a shared/public cache. */
export const dynamic = "force-dynamic";

const numericStyle: React.CSSProperties = { fontVariantNumeric: "tabular-nums lining-nums" };

interface EnrollmentsPageProps {
  searchParams: Promise<{ page?: string | string[] }>;
}

/**
 * Read-only. Only a plain page-number query param is ever accepted. The
 * "student snapshot" columns (name/email/phone) are the registration's own
 * immutable, registration-time values — never a live join back to the
 * Student's current record, which may since have been updated by a later
 * approval. A legacy registration with `studentId` absent entirely (every
 * registration created before Phase 1 shipped) renders "Not linked" here
 * rather than throwing.
 */
export default async function MasterclassAdminEnrollmentsPage({ searchParams }: EnrollmentsPageProps) {
  const { page: rawPage } = await searchParams;
  const page = parsePageParam(rawPage);

  const { registrations, totalCount } = await listEnrollmentsPage(page, ADMIN_PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(totalCount / ADMIN_PAGE_SIZE));

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "2.5rem 1.25rem" }}>
      <h1 style={{ fontSize: "1.4rem", marginBottom: "0.3rem" }}>Enrollments</h1>
      <p style={{ color: "#666", marginBottom: "1.25rem", fontSize: "0.9rem" }}>
        <span style={numericStyle}>{totalCount}</span> total &middot; page{" "}
        <span style={numericStyle}>{page}</span> of <span style={numericStyle}>{totalPages}</span>
      </p>

      {registrations.length === 0 ? <p>No enrollments yet.</p> : null}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #d8d8d0" }}>
              <th style={{ padding: "0.5rem 0.75rem 0.5rem 0" }}>Enrollment ref</th>
              <th style={{ padding: "0.5rem 0.75rem" }}>Student link</th>
              <th style={{ padding: "0.5rem 0.75rem" }}>Batch</th>
              <th style={{ padding: "0.5rem 0.75rem" }}>Name</th>
              <th style={{ padding: "0.5rem 0.75rem" }}>Email</th>
              <th style={{ padding: "0.5rem 0.75rem" }}>Phone</th>
              <th style={{ padding: "0.5rem 0.75rem" }}>Status</th>
              <th style={{ padding: "0.5rem 0.75rem" }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {registrations.map((row) => (
              <tr key={row.publicRegistrationRef} style={{ borderBottom: "1px solid #ece9e2" }}>
                <td style={{ padding: "0.5rem 0.75rem 0.5rem 0", ...numericStyle }}>{row.publicRegistrationRef}</td>
                <td style={{ padding: "0.5rem 0.75rem", ...numericStyle }}>{row.linkedPublicStudentId ?? "Not linked"}</td>
                <td style={{ padding: "0.5rem 0.75rem", ...numericStyle }}>{row.batchId}</td>
                <td style={{ padding: "0.5rem 0.75rem" }}>{row.name}</td>
                <td style={{ padding: "0.5rem 0.75rem" }}>{row.email}</td>
                <td style={{ padding: "0.5rem 0.75rem", ...numericStyle }}>{row.phone}</td>
                <td style={{ padding: "0.5rem 0.75rem" }}>{row.status}</td>
                <td style={{ padding: "0.5rem 0.75rem" }}>{new Date(row.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem", fontSize: "0.9rem" }}>
        {page > 1 ? <a href={`/masterclass/admin/enrollments?page=${page - 1}`}>← Previous</a> : null}
        {page < totalPages ? <a href={`/masterclass/admin/enrollments?page=${page + 1}`}>Next →</a> : null}
      </div>
    </main>
  );
}
