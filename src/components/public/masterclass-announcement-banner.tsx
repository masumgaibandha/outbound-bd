"use client";

import { useState } from "react";
import Link from "next/link";

import { Container } from "@/components/public/container";
import { XIcon } from "@/components/public/icons";
import { classDates, masterclassSlug } from "@/lib/masterclass/constants";
import { formatClassDatesEn } from "@/lib/masterclass/format";

const MASTERCLASS_HREF = `/masterclass/${masterclassSlug}`;

/**
 * Only ever mounted by `(public)/layout.tsx` when
 * `isRegistrationEnabled()` is true — that check happens server-side, so
 * this component itself never reads the flag (and never could: it's a
 * Client Component). Dismissal is local `useState`, intentionally lost on
 * reload/navigation to a fresh document — no cookie, no localStorage, no
 * tracking.
 */
export function MasterclassAnnouncementBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const dateLabel = formatClassDatesEn(classDates.day1, classDates.day2);

  return (
    <div
      role="region"
      aria-label="Masterclass announcement"
      className="bg-accent border-hairline border-b"
    >
      <Container className="relative flex items-center justify-center py-2.5 pr-10 sm:pr-12">
        <p className="text-ink text-center text-sm leading-snug text-balance">
          {`2-Day Live Masterclass: Lead Generation & Cold Email Outreach — ${dateLabel}`}{" "}
          <Link
            href={MASTERCLASS_HREF}
            className="text-action hover:text-action-hover focus-visible:outline-action rounded-sm font-semibold underline decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            View Masterclass
          </Link>
        </p>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss masterclass announcement"
          className="text-ink-muted hover:text-ink focus-visible:outline-action absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 sm:right-4"
        >
          <XIcon width={16} height={16} aria-hidden="true" />
        </button>
      </Container>
    </div>
  );
}
