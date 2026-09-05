import type { Metadata } from "next";

import { ADMIN_PAGE_SIZE, parsePageParam } from "@/lib/masterclass/pagination";
import { listStudentsPage } from "@/lib/masterclass/students-repository";

export const metadata: Metadata = {
  title: "Masterclass admin — Students",
  robots: { index: false, follow: false },
};

/* Renders real names/emails/phones — must never be served from a shared/public cache. */
export const dynamic = "force-dynamic";

const numericStyle: React.CSSProperties = { fontVariantNumeric: "tabular-nums lining-nums" };

interface StudentsPageProps {
  searchParams: Promise<{ page?: string | string[] }>;
}

/**
 * Read-only. Only a plain page-number query param is ever accepted — never
 * a raw Mongo query, sort expression, or regex (see `pagination.ts`).
 * Every row shown here is a projected summary (`StudentListRow`); no full
 * Student document, and nothing that could serve as an auth secret, ever
 * reaches this page.
 */
export default async function MasterclassAdminStudentsPage({ searchParams }: StudentsPageProps) {
  const { page: rawPage } = await searchParams;
  const page = parsePageParam(rawPage);

  const { students, totalCount } = await listStudentsPage(page, ADMIN_PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(totalCount / ADMIN_PAGE_SIZE));

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "2.5rem 1.25rem" }}>
      <h1 style={{ fontSize: "1.4rem", marginBottom: "0.3rem" }}>Students</h1>
      <p style={{ color: "#666", marginBottom: "1.25rem", fontSize: "0.9rem" }}>
        <span style={numericStyle}>{totalCount}</span> total &middot; page{" "}
        <span style={numericStyle}>{page}</span> of <span style={numericStyle}>{totalPages}</span>
      </p>

      {students.length === 0 ? <p>No students yet.</p> : null}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #d8d8d0" }}>
              <th style={{ padding: "0.5rem 0.75rem 0.5rem 0" }}>Student ID</th>
              <th style={{ padding: "0.5rem 0.75rem" }}>Name</th>
              <th style={{ padding: "0.5rem 0.75rem" }}>Email</th>
              <th style={{ padding: "0.5rem 0.75rem" }}>Phone</th>
              <th style={{ padding: "0.5rem 0.75rem" }}>First enrolled</th>
              <th style={{ padding: "0.5rem 0.75rem" }}>Enrollments</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.publicStudentId} style={{ borderBottom: "1px solid #ece9e2" }}>
                <td style={{ padding: "0.5rem 0.75rem 0.5rem 0", ...numericStyle }}>{student.publicStudentId}</td>
                <td style={{ padding: "0.5rem 0.75rem" }}>{student.name}</td>
                <td style={{ padding: "0.5rem 0.75rem" }}>{student.email}</td>
                <td style={{ padding: "0.5rem 0.75rem", ...numericStyle }}>{student.phone}</td>
                <td style={{ padding: "0.5rem 0.75rem" }}>{new Date(student.firstEnrolledAt).toLocaleDateString()}</td>
                <td style={{ padding: "0.5rem 0.75rem", ...numericStyle }}>{student.enrollmentCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem", fontSize: "0.9rem" }}>
        {page > 1 ? <a href={`/masterclass/admin/students?page=${page - 1}`}>← Previous</a> : null}
        {page < totalPages ? <a href={`/masterclass/admin/students?page=${page + 1}`}>Next →</a> : null}
      </div>
    </main>
  );
}
