"use client";

import { useState, useTransition, type CSSProperties } from "react";

import {
  approveOrderAction,
  rejectOrderAction,
  retryDeliveryAction,
} from "@/app/masterclass/admin/orders/actions";
import type { AdminReviewOrder } from "@/lib/masterclass/payment-orders-repository";

const METHOD_LABEL: Record<string, string> = {
  BKASH: "bKash",
  NAGAD: "Nagad",
  ROCKET: "Rocket",
  BANK: "Bank Transfer",
};

type PendingAction = "approve" | "reject" | "retry" | null;

/** Tabular, lining figures for references, phone numbers, transaction IDs, and amounts — this admin island is already plain `system-ui` sans, so only the numeric-variant styling is needed here (no font-family change). */
const numericStyle: CSSProperties = { fontVariantNumeric: "tabular-nums lining-nums" };

/**
 * Ported verbatim from the MasumDev masterclass source. The entire admin UI
 * in one small client island — everything else on the page is a Server
 * Component. No dashboard framework, no client-side fetching: every action
 * is a direct Server Action call, protected by the same Basic Auth
 * middleware guarding the page this is rendered on. Button styling comes
 * from the `.mc-admin-*` classes defined once in the parent page (see its
 * own comment) — plain CSS, not Tailwind, since hover/focus states need
 * real pseudo-classes an inline `style` object can't express.
 */
export function OrderRow({ order }: { order: AdminReviewOrder }) {
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [needsRetry, setNeedsRetry] = useState(false);
  const [processed, setProcessed] = useState(false);
  const [reason, setReason] = useState("");

  function approve() {
    setPendingAction("approve");
    startTransition(async () => {
      const result = await approveOrderAction(order.publicOrderRef);
      setMessage(result.message);
      setNeedsRetry(Boolean(result.needsRetry));
      if (result.ok) setProcessed(true);
      setPendingAction(null);
    });
  }

  function reject() {
    setPendingAction("reject");
    startTransition(async () => {
      const result = await rejectOrderAction(order.publicOrderRef, reason);
      setMessage(result.message);
      if (result.ok) setProcessed(true);
      setPendingAction(null);
    });
  }

  function retry() {
    setPendingAction("retry");
    startTransition(async () => {
      const result = await retryDeliveryAction(order.publicOrderRef);
      setMessage(result.message);
      setNeedsRetry(Boolean(result.needsRetry));
      setPendingAction(null);
    });
  }

  return (
    <div style={{ border: "1px solid #d8d8d0", borderRadius: 8, padding: "1rem", opacity: processed ? 0.6 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", fontWeight: 600 }}>
        <span style={numericStyle}>{order.publicRegistrationRef}</span>
        <span style={{ fontWeight: 400, color: "#666" }}>{new Date(order.createdAt).toLocaleString()}</span>
      </div>
      <p style={{ margin: "0.4rem 0" }}>
        {order.name} &middot; {order.email} &middot; <span style={numericStyle}>{order.phone}</span>
      </p>
      <p style={{ margin: "0.4rem 0" }}>
        <strong>{order.method ? METHOD_LABEL[order.method] : "—"}</strong>{" "}
        &middot;{" "}
        {order.method === "BANK" ? (
          <>
            payer {order.manualPayment?.payerName ?? "—"}
            {order.manualPayment?.senderBankName ? ` (${order.manualPayment.senderBankName})` : ""}
          </>
        ) : (
          <>
            sender <span style={numericStyle}>{order.manualPayment?.senderNumber ?? "—"}</span>
          </>
        )}{" "}
        &middot; TxID{" "}
        <code style={numericStyle}>{order.manualPayment?.transactionIdRaw ?? "—"}</code> &middot;{" "}
        <span style={numericStyle}>
          {order.currency} {order.amount}
        </span>
      </p>
      {order.attributionSource ? (
        <p style={{ margin: "0.4rem 0", fontSize: "0.82em", color: "#888" }}>utm_source: {order.attributionSource}</p>
      ) : null}

      {!processed ? (
        <div style={{ marginTop: "0.9rem", paddingTop: "0.9rem", borderTop: "1px solid #ece9e2" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={approve}
              disabled={isPending}
              className="mc-admin-btn mc-admin-btn-approve"
            >
              {pendingAction === "approve" ? "Approving…" : "Approve"}
            </button>
            <span style={{ fontSize: "0.82em", color: "#888" }}>Approving will mark this order as PAID</span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.75rem", marginTop: "0.75rem" }}>
            <button
              type="button"
              onClick={reject}
              disabled={isPending}
              className="mc-admin-btn mc-admin-btn-reject"
            >
              {pendingAction === "reject" ? "Rejecting…" : "Reject"}
            </button>
            <input
              placeholder="Rejection reason (optional)"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={isPending}
              className="mc-admin-input"
              style={{ flex: "1 1 220px" }}
            />
          </div>
        </div>
      ) : null}

      {needsRetry ? (
        <button
          type="button"
          onClick={retry}
          disabled={isPending}
          className="mc-admin-btn mc-admin-btn-retry"
          style={{ marginTop: "0.75rem" }}
        >
          {pendingAction === "retry" ? "Retrying…" : "Retry email / Meta CAPI"}
        </button>
      ) : null}

      {message ? <p style={{ marginTop: "0.75rem", fontSize: "0.9em" }}>{message}</p> : null}
    </div>
  );
}
