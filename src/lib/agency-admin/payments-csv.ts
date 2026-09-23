import { PAYMENT_METHOD_LABELS, PAYMENT_TYPE_LABELS } from "@/lib/agency-admin/clients-labels";
import { buildCsv, buildCsvFilename } from "@/lib/agency-admin/csv-core";
import type { PaymentListRow } from "@/lib/agency-admin/payments-repository";
import { formatCents } from "@/lib/agency-admin/money";
import type { PaymentFiltersInput } from "@/lib/agency-admin/payments-validation";
import { utcInstantToDhakaDateOnly } from "@/lib/agency-admin/timezone";

const CSV_HEADER = ["Date", "Client", "Amount", "Method", "Type", "Reference", "Note"];

export function buildPaymentsCsv(payments: PaymentListRow[]): string {
  const rows = payments.map((payment) => [
    utcInstantToDhakaDateOnly(payment.paidAt),
    payment.clientCompany,
    formatCents(payment.amountCents),
    PAYMENT_METHOD_LABELS[payment.method],
    PAYMENT_TYPE_LABELS[payment.type],
    payment.reference ?? "",
    payment.note ?? "",
  ]);

  return buildCsv(CSV_HEADER, rows);
}

/** e.g. "outboundbd-payments-2026-09-01-to-2026-09-30.csv" — falls back to "all" on either open end. */
export function buildPaymentsCsvFilename(filters: PaymentFiltersInput): string {
  return buildCsvFilename("payments", filters.from, filters.to);
}
