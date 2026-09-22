"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

import { STRATEGY_CALL_HREF } from "@/components/public/site-config";
import { consumeAgencyLeadPrefill } from "@/lib/agency-lead-prefill";

/*
 * No `declare global` for `window.Calendly` — same inline-cast convention
 * `src/lib/tracking/fire-lead-pixel-event.ts` uses for `window.fbq`. This is
 * the only file that ever touches this global, so it owns the shape below
 * without risking a conflict.
 */
interface CalendlyGlobal {
  Calendly?: {
    initInlineWidget: (options: {
      url: string;
      parentElement: HTMLElement;
      prefill?: { name?: string; email?: string };
    }) => void;
  };
}

/**
 * Inline Calendly embed, prefilled with the name/email the lead form just
 * collected — passed via `consumeAgencyLeadPrefill()` (sessionStorage),
 * NEVER a URL query param: this page's own URL must stay exactly
 * `/agencies/thank-you`, because the Meta Pixel's PageView event reports
 * the current page URL to Meta on load, and a name/email in that URL would
 * leak straight into Meta's systems. Calendly's own `initInlineWidget` API
 * passes prefill data into its iframe programmatically, not through this
 * page's address bar.
 */
export function CalendlyInlineEmbed() {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  function initWidget() {
    const container = containerRef.current;
    const calendly = (window as unknown as CalendlyGlobal).Calendly;
    if (!container || !calendly || initializedRef.current) return;

    const prefill = consumeAgencyLeadPrefill();
    calendly.initInlineWidget({
      url: STRATEGY_CALL_HREF,
      parentElement: container,
      prefill: prefill ? { name: prefill.name, email: prefill.email } : undefined,
    });
    initializedRef.current = true;
  }

  useEffect(() => {
    // Covers the case where the Calendly script is already loaded (e.g. a
    // second visit this session) — next/script's onLoad only fires once
    // per actual script load, not on every mount.
    initWidget();
  }, []);

  return (
    <>
      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="afterInteractive"
        onLoad={initWidget}
      />
      {/*
        Deliberately NOT the `calendly-inline-widget` class — that name is a
        magic marker Calendly's own widget.js auto-scans the page for on
        load, expecting a `data-url` attribute; without one, its own
        auto-init code throws (`Cannot read properties of null`) and breaks
        `window.Calendly` for everyone, including our own explicit
        `initInlineWidget()` call below. That's why the programmatic API is
        used here instead: `prefill` has to reach Calendly without ever
        touching this page's URL, and this API doesn't need the class at
        all. `initInlineWidget` creates the iframe with no sizing of its
        own, so without the `[&>iframe]` rules below it falls back to the
        browser's bare default iframe size (150px).
      */}
      <div
        ref={containerRef}
        className="h-[700px] w-full [&>iframe]:h-full [&>iframe]:w-full [&>iframe]:border-0"
      />
    </>
  );
}
