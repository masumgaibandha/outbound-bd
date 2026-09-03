"use client";

import { useSyncExternalStore } from "react";

import { MetaPixel } from "@/components/masterclass/MetaPixel";
import {
  MARKETING_CONSENT_CHANGE_EVENT,
  MARKETING_CONSENT_STORAGE_KEY,
} from "@/components/masterclass/MarketingConsentBanner";

interface MetaPixelGateProps {
  pixelId: string;
  contentName: string;
  currency: string;
  value: number;
}

function readConsentGranted(): boolean {
  try {
    return window.localStorage.getItem(MARKETING_CONSENT_STORAGE_KEY) === "granted";
  } catch {
    return false;
  }
}

function subscribeToConsent(callback: () => void) {
  window.addEventListener(MARKETING_CONSENT_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(MARKETING_CONSENT_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getServerConsentGranted(): boolean {
  return false;
}

/**
 * New in this port — not present in the MasumDev masterclass source, which
 * rendered `MetaPixel` directly from `page.tsx` with no consent check.
 * Client Component so it can read the visitor's stored choice from
 * `MarketingConsentBanner.tsx` before ever mounting the Pixel bootstrap
 * script; `useSyncExternalStore` re-renders on `mc-consent-changed` so
 * accepting the banner starts tracking immediately, without a page reload.
 * Consent denied, absent, or unreadable (private browsing) all mean the
 * same thing: render nothing.
 */
export function MetaPixelGate(props: MetaPixelGateProps) {
  const granted = useSyncExternalStore(
    subscribeToConsent,
    readConsentGranted,
    getServerConsentGranted,
  );

  if (!granted) return null;

  return <MetaPixel {...props} />;
}
