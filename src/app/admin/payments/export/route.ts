import { NextResponse } from "next/server";

import { UnauthorizedAgencyAdminError, requireAgencyAdmin } from "@/lib/agency-admin/admin-auth";
import { buildPaymentsCsv, buildPaymentsCsvFilename } from "@/lib/agency-admin/payments-csv";
import { listAllFilteredPayments } from "@/lib/agency-admin/payments-repository";
import { parsePaymentFilters } from "@/lib/agency-admin/payments-validation";

/**
 * Exports every row matching the current filters (not just the current
 * page) — same filter parsing as `/admin/payments`'s list page. Re-checks
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
  const filters = parsePaymentFilters(searchParams);

  const payments = await listAllFilteredPayments(filters);
  const csv = buildPaymentsCsv(payments);
  const filename = buildPaymentsCsvFilename(filters);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
