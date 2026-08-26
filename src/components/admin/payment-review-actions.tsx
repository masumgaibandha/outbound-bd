"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ReviewAction = "VERIFY" | "REJECT" | "REQUEST_RESUBMISSION";

export function PaymentReviewActions({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<ReviewAction | null>(null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(action: ReviewAction, actionReason?: string) {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/payments/${paymentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: actionReason }),
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
            onClick={() => submit(pendingAction, reason)}
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

  return (
    <div className="flex flex-col gap-2">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => submit("VERIFY")}
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
