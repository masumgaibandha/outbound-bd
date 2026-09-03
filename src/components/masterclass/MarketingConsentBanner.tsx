"use client";

import { useSyncExternalStore } from "react";

export const MARKETING_CONSENT_STORAGE_KEY = "mc-marketing-consent";
export const MARKETING_CONSENT_CHANGE_EVENT = "mc-consent-changed";

type ConsentValue = "granted" | "denied";

function readStoredConsent(): ConsentValue | null {
  try {
    const value = window.localStorage.getItem(MARKETING_CONSENT_STORAGE_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

function writeConsent(value: ConsentValue) {
  try {
    window.localStorage.setItem(MARKETING_CONSENT_STORAGE_KEY, value);
  } catch {
    /* Private browsing / blocked storage — the banner still hides, tracking just stays off this session. */
  }
  window.dispatchEvent(new Event(MARKETING_CONSENT_CHANGE_EVENT));
}

function subscribeToConsent(callback: () => void) {
  window.addEventListener(MARKETING_CONSENT_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(MARKETING_CONSENT_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** `null` on the server (and for the pre-hydration client render) — matches "no decision yet," so the banner never flashes hidden-then-visible. */
function getServerConsentSnapshot(): ConsentValue | null {
  return null;
}

/**
 * New in this port — not present in the MasumDev masterclass source, which
 * fired the Meta Pixel unconditionally. First-party, no cookie-consent
 * vendor: a dismissible bottom bar shown only until the visitor picks
 * Accept or Decline, persisted in `localStorage` so it doesn't reappear.
 * `MetaPixelGate.tsx` reads the same key and listens for the same event to
 * decide whether to mount the Pixel. `useSyncExternalStore` (rather than a
 * `useState`+`useEffect` pair) reads `localStorage` because it's the
 * React-blessed way to subscribe to state that lives outside React without
 * an effect-body `setState` call.
 */
export function MarketingConsentBanner() {
  const consent = useSyncExternalStore(
    subscribeToConsent,
    readStoredConsent,
    getServerConsentSnapshot,
  );

  if (consent !== null) return null;

  function choose(value: ConsentValue) {
    writeConsent(value);
  }

  return (
    <div
      role="region"
      aria-label="মার্কেটিং কুকি সম্মতি"
      className="border-hairline bg-surface text-ink fixed inset-x-0 bottom-0 z-50 border-t px-4 py-4 shadow-[0_-4px_16px_rgb(0_0_0/0.08)] sm:px-6"
    >
      <div className="mx-auto flex max-w-3xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="font-bengali text-ink-muted text-sm leading-relaxed">
          আমরা ভবিষ্যৎ অফার ও আপডেট সম্পর্কে জানাতে ঐচ্ছিক মার্কেটিং ট্র্যাকিং ব্যবহার করতে চাই। আপনি চাইলে এটি বন্ধ রাখতে পারেন।
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => choose("denied")}
            className="border-hairline text-ink hover:border-action hover:text-action focus-visible:outline-action font-bengali inline-flex h-10 items-center rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            না, ধন্যবাদ
          </button>
          <button
            type="button"
            onClick={() => choose("granted")}
            className="bg-action hover:bg-action-hover focus-visible:outline-action font-bengali inline-flex h-10 items-center rounded-full px-4 text-sm font-medium text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            সম্মত আছি
          </button>
        </div>
      </div>
    </div>
  );
}
