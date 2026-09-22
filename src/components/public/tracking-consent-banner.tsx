"use client";

import { useState } from "react";
import Link from "next/link";

import { buttonClass } from "@/components/public/button";
import { AGENCY_AD_CONSENT_COOKIE, type TrackingConsentChoice } from "@/lib/tracking/consent";
import { writeBrowserCookie } from "@/lib/tracking/browser-cookie";

const CONSENT_COOKIE_MAX_AGE_DAYS = 180;

interface TrackingConsentBannerProps {
  onDecision: (choice: TrackingConsentChoice) => void;
}

/**
 * Shown only to visitors `TrackingGate` has classified as UK/EU/EEA with no
 * prior decision. Fixed to the bottom of the viewport (out of normal flow),
 * so it never causes layout shift for the content behind it.
 */
export function TrackingConsentBanner({ onDecision }: TrackingConsentBannerProps) {
  const [isPending, setIsPending] = useState(false);

  function choose(choice: TrackingConsentChoice) {
    setIsPending(true);
    writeBrowserCookie(AGENCY_AD_CONSENT_COOKIE, choice, {
      maxAgeDays: CONSENT_COOKIE_MAX_AGE_DAYS,
    });
    onDecision(choice);
  }

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="border-hairline bg-surface text-ink fixed inset-x-0 bottom-0 z-50 border-t px-4 py-4 shadow-[0_-4px_16px_rgb(0_0_0/0.08)] sm:px-6"
    >
      <div className="mx-auto flex max-w-3xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="text-ink-muted text-sm leading-relaxed">
          We use Meta Pixel and Conversions API to measure how our ads
          perform. You can decline this tracking. See our{" "}
          <Link
            href="/privacy-policy"
            className="text-ink decoration-action hover:text-action font-medium underline decoration-2 underline-offset-2 transition-colors"
          >
            Privacy Policy
          </Link>{" "}
          for details.
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => choose("denied")}
            disabled={isPending}
            className={buttonClass({ tone: "outline", size: "md", className: "disabled:cursor-not-allowed disabled:opacity-60" })}
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => choose("granted")}
            disabled={isPending}
            className={buttonClass({ tone: "ink", size: "md", className: "disabled:cursor-not-allowed disabled:opacity-60" })}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
