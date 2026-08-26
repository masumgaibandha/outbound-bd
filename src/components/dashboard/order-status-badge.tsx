import type { OrderStatus } from "@/lib/models/order";

const STATUS_LABELS: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: "Awaiting payment",
  PAYMENT_PROCESSING: "Payment processing",
  PAID: "Paid",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  PAYMENT_FAILED: "Payment failed",
  REFUNDED: "Refunded",
  EXPIRED: "Expired",
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: "bg-amber-50 text-amber-700",
  PAYMENT_PROCESSING: "bg-amber-50 text-amber-700",
  PAID: "bg-emerald-50 text-emerald-700",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  COMPLETED: "bg-neutral-100 text-neutral-700",
  CANCELLED: "bg-neutral-100 text-neutral-500",
  PAYMENT_FAILED: "bg-red-50 text-red-700",
  REFUNDED: "bg-neutral-100 text-neutral-700",
  EXPIRED: "bg-neutral-100 text-neutral-500",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
