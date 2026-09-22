"use client";

import { useState } from "react";

import { MetaPixel } from "@/components/public/meta-pixel";
import { TrackingConsentBanner } from "@/components/public/tracking-consent-banner";
import { readBrowserCookie } from "@/lib/tracking/browser-cookie";
import {
  AGENCY_AD_CONSENT_COOKIE,
  AGENCY_REGION_COOKIE,
  isTrackingAllowed,
  shouldShowConsentBanner,
  type TrackingConsentChoice,
} from "@/lib/tracking/consent";

interface GateState {
  trackingAllowed: boolean;
  showBanner: boolean;
}

/**
 * A Client Component so this can decide pixel/banner visibility from
 * `document.cookie` alone — no `headers()`/`cookies()` anywhere in the
 * `(public)` tree, so every public page keeps statically generating (the
 * region cookie itself comes from `proxy.ts`, which runs in front of the
 * cache rather than inside the render tree).
 *
 * The `useState(computeInitialState)` lazy initializer is what avoids a
 * "flash": on the server (and the pre-hydration client render), `document`
 * doesn't exist, so this renders nothing at all for every visitor — no
 * banner, no pixel, baked into the static HTML the same way for everyone.
 * On hydration, the initializer re-runs with a real `document`, and the
 * *first* client render already shows the correct final state (no
 * useEffect, no later "actually, here's the real answer" swap) — unlike the
 * old `useSyncExternalStore`-based gate this replaced for the masterclass
 * pixel (see that removal's commit message), which deliberately returned a
 * server snapshot and then re-rendered once actual state was known.
 */
function computeInitialState(): GateState {
  if (typeof document === "undefined") {
    return { trackingAllowed: false, showBanner: false };
  }
  const region = readBrowserCookie(AGENCY_REGION_COOKIE);
  const consent = readBrowserCookie(AGENCY_AD_CONSENT_COOKIE);
  return {
    trackingAllowed: isTrackingAllowed({ region, consent }),
    showBanner: shouldShowConsentBanner({ region, consent }),
  };
}

export function TrackingGate() {
  const pixelId = process.env.NEXT_PUBLIC_AGENCY_META_PIXEL_ID;
  const [state, setState] = useState(computeInitialState);

  if (!pixelId) return null;

  function handleDecision(choice: TrackingConsentChoice) {
    setState({ trackingAllowed: choice === "granted", showBanner: false });
  }

  return (
    <>
      {state.trackingAllowed ? <MetaPixel pixelId={pixelId} /> : null}
      {state.showBanner ? <TrackingConsentBanner onDecision={handleDecision} /> : null}
    </>
  );
}
