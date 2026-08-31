import type { PaymentMatchResult } from "@/lib/payment-match";

const LABELS: Record<PaymentMatchResult, string> = {
  MATCH: "Matches expected",
  UNDERPAID: "Underpaid",
  OVERPAID: "Overpaid",
  CURRENCY_MISMATCH: "Currency mismatch",
};

const STYLES: Record<PaymentMatchResult, string> = {
  MATCH: "bg-emerald-50 text-emerald-700",
  UNDERPAID: "bg-red-50 text-red-700",
  OVERPAID: "bg-amber-50 text-amber-700",
  CURRENCY_MISMATCH: "bg-red-50 text-red-700",
};

export function PaymentMatchBadge({ result }: { result: PaymentMatchResult }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STYLES[result]}`}
    >
      {LABELS[result]}
    </span>
  );
}
