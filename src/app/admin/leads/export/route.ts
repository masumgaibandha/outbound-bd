import { NextResponse } from "next/server";

import { UnauthorizedAgencyAdminError, requireAgencyAdmin } from "@/lib/agency-admin/admin-auth";
import { buildLeadsCsv, buildLeadsCsvFilename } from "@/lib/agency-admin/csv";
import { listAllFilteredLeads } from "@/lib/agency-admin/leads-repository";
import { parseLeadFilters } from "@/lib/agency-admin/validation";

/**
 * Exports every row matching the current filters (not just the current
 * page) — same filter parsing as `/admin/leads`'s list page, so "download
 * CSV" always matches what the operator is looking at. Re-checks
 * `requireAgencyAdmin()` itself, same belt-and-suspenders contract as every
 * other agency admin mutation/read (see `leads/actions.ts`).
 */
export async function GET(request: Request): Promise<Response> {
  try {
    await requireAgencyAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedAgencyAdminError) {
      return new NextResponse("Not authorized.", { status: 401 });
    }
    throw error;
  }

  const url = new URL(request.url);
  const searchParams = Object.fromEntries(url.searchParams.entries());
  const filters = parseLeadFilters(searchParams);

  const leads = await listAllFilteredLeads(filters);
  const csv = buildLeadsCsv(leads);
  const filename = buildLeadsCsvFilename(filters);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
