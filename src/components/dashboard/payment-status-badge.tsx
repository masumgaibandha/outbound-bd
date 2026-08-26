import type { PaymentStatus } from "@/lib/models/payment";

const STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING_REVIEW: "Pending review",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
  RESUBMISSION_REQUESTED: "Resubmission requested",
};

const STATUS_STYLES: Record<PaymentStatus, string> = {
  PENDING_REVIEW: "bg-amber-50 text-amber-700",
  VERIFIED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700",
  RESUBMISSION_REQUESTED: "bg-amber-50 text-amber-700",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
