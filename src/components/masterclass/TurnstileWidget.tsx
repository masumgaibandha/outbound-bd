"use client";

import Script from "next/script";
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";

/*
 * No wrapper package — explicit rendering against Cloudflare's own script,
 * per Cloudflare's documented API:
 * https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/#explicitly-render-the-turnstile-widget
 * Ported verbatim from the MasumDev masterclass source — no brand-specific
 * content in this file.
 */
const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TURNSTILE_SCRIPT_ID = "cf-turnstile-script";

/** Must match `EXPECTED_ACTION` in `src/lib/masterclass/turnstile.ts` — the two can't literally share a constant across the server/client boundary, so keep them in sync by hand if this ever changes. */
export const TURNSTILE_ACTION = "masterclass_registration";

interface TurnstileRenderOptions {
  sitekey: string;
  action: string;
  language: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
  "timeout-callback": () => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export interface TurnstileWidgetHandle {
  /** Tokens are single-use — call this after any failed/rejected submission before the next attempt. */
  reset: () => void;
}

interface TurnstileWidgetProps {
  siteKey: string;
  onToken: (token: string) => void;
  onExpire: () => void;
  onError: () => void;
  ref?: Ref<TurnstileWidgetHandle>;
}

/**
 * Explicit-render Turnstile widget. Loads Cloudflare's script once (deduped
 * by `next/script`'s `id`), then renders into a local container div only
 * once the script is ready — checked both via the script's own `onLoad` and
 * a synchronous `window.turnstile` check on mount, since `onLoad` only ever
 * fires for the very first script load, not for a Strict-Mode remount of
 * this component after the script is already present.
 *
 * Strict Mode safety: the render effect's cleanup calls `turnstile.remove()`
 * and clears the local "already rendered" ref, so a mount → cleanup →
 * remount cycle (what Strict Mode does in development) ends with exactly
 * one live widget, never two.
 */
export function TurnstileWidget({ siteKey, onToken, onExpire, onError, ref }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
    },
  }));

  useEffect(() => {
    /*
     * Covers the Strict-Mode remount case: `next/script`'s `onLoad` only
     * ever fires for the very first load of a given script id, so a second
     * mount (after the script is already present from the first) needs its
     * own synchronous check to notice `window.turnstile` already exists.
     */
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional one-time mount check, not an external-system sync loop.
    if (window.turnstile) setScriptReady(true);
  }, []);

  useEffect(() => {
    if (!scriptReady || !containerRef.current || !window.turnstile) return;
    if (widgetIdRef.current) return; // already rendered this mount

    const turnstile = window.turnstile;
    const widgetId = turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action: TURNSTILE_ACTION,
      language: "auto",
      callback: onToken,
      "expired-callback": onExpire,
      "error-callback": onError,
      "timeout-callback": onExpire,
    });
    widgetIdRef.current = widgetId;

    return () => {
      turnstile.remove(widgetId);
      widgetIdRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callbacks are stable enough for this widget's lifetime; re-running on every render identity change would tear down and re-challenge the user.
  }, [scriptReady, siteKey]);

  return (
    <>
      <Script
        id={TURNSTILE_SCRIPT_ID}
        src={TURNSTILE_SCRIPT_SRC}
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <div ref={containerRef} />
    </>
  );
}
