import { NextResponse } from "next/server";

import { UnauthorizedAgencyAdminError, requireAgencyAdmin } from "@/lib/agency-admin/admin-auth";
import { buildClientsCsv, buildClientsCsvFilename } from "@/lib/agency-admin/clients-csv";
import { listAllFilteredClients } from "@/lib/agency-admin/clients-repository";
import { parseClientFilters } from "@/lib/agency-admin/clients-validation";

/**
 * Exports every row matching the current filters (not just the current
 * page) — same filter parsing as `/admin/clients`'s list page. Re-checks
 * `requireAgencyAdmin()` itself, same belt-and-suspenders contract as
 * `leads/export/route.ts`.
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
  const filters = parseClientFilters(searchParams);

  const clients = await listAllFilteredClients(filters);
  const csv = buildClientsCsv(clients);
  const filename = buildClientsCsvFilename();

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
