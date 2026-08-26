"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  async function handleCancel() {
    setIsCancelling(true);
    setError(null);

    try {
      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
      } | null;

      if (!response.ok || !payload?.ok) {
        setError(payload?.message ?? "Unable to cancel this order.");
        setIsCancelling(false);
        setIsConfirming(false);
        return;
      }

      router.refresh();
    } catch {
      setError("Unable to cancel this order. Please try again.");
      setIsCancelling(false);
      setIsConfirming(false);
    }
  }

  if (isConfirming) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-neutral-700">
          Cancel this order? This can&apos;t be undone.
        </p>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isCancelling}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {isCancelling ? "Cancelling…" : "Yes, cancel order"}
          </button>
          <button
            type="button"
            onClick={() => setIsConfirming(false)}
            disabled={isCancelling}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Keep order
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsConfirming(true)}
      className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
    >
      Cancel order
    </button>
  );
}
