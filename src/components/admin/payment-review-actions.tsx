"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { PaymentMatchResult } from "@/lib/payment-match";

type ReviewAction = "VERIFY" | "REJECT" | "REQUEST_RESUBMISSION";

const MISMATCH_OVERRIDE_MIN_LENGTH = 10;

export function PaymentReviewActions({
  paymentId,
  matchResult,
}: {
  paymentId: string;
  matchResult: PaymentMatchResult;
}) {
  const router = useRouter();
  const isMismatched = matchResult !== "MATCH";
  const [pendingAction, setPendingAction] = useState<ReviewAction | null>(null);
  const [reason, setReason] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(action: ReviewAction, body: Record<string, string | undefined>) {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/payments/${paymentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
      } | null;

      if (!response.ok || !payload?.ok) {
        setError(payload?.message ?? "Unable to submit review.");
        setIsSubmitting(false);
        return;
      }

      router.refresh();
    } catch {
      setError("Unable to submit review. Please try again.");
      setIsSubmitting(false);
    }
  }

  if (pendingAction === "REJECT" || pendingAction === "REQUEST_RESUBMISSION") {
    return (
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-neutral-900">
          {pendingAction === "REJECT" ? "Reason for rejection" : "What does the client need to resubmit?"}
        </label>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isSubmitting || reason.trim().length < 3}
            onClick={() => submit(pendingAction, { reason })}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {isSubmitting
              ? "Submitting…"
              : pendingAction === "REJECT"
                ? "Confirm rejection"
                : "Request resubmission"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPendingAction(null);
              setReason("");
            }}
            disabled={isSubmitting}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (pendingAction === "VERIFY" && isMismatched) {
    return (
      <div className="flex flex-col gap-2">
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          This payment doesn&apos;t match the expected amount/currency. Verifying it anyway requires an
          override reason, which is recorded in the payment&apos;s audit history.
        </div>
        <label className="text-sm font-medium text-neutral-900">Override reason</label>
        <textarea
          value={overrideReason}
          onChange={(event) => setOverrideReason(event.target.value)}
          rows={3}
          placeholder={`Explain why this should be verified despite the mismatch (min ${MISMATCH_OVERRIDE_MIN_LENGTH} characters)`}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isSubmitting || overrideReason.trim().length < MISMATCH_OVERRIDE_MIN_LENGTH}
            onClick={() => submit("VERIFY", { overrideReason })}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {isSubmitting ? "Submitting…" : "Verify despite mismatch"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPendingAction(null);
              setOverrideReason("");
            }}
            disabled={isSubmitting}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => (isMismatched ? setPendingAction("VERIFY") : submit("VERIFY", {}))}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          Verify payment
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => setPendingAction("REJECT")}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
        >
          Reject
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => setPendingAction("REQUEST_RESUBMISSION")}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Request resubmission
        </button>
      </div>
    </div>
  );
}
