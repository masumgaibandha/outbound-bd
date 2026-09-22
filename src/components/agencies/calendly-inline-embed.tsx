"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";

import { STRATEGY_CALL_HREF } from "@/components/public/site-config";
import { getStoredAgencyAttribution } from "@/lib/agency-attribution";
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
      utm?: {
        utmSource?: string;
        utmMedium?: string;
        utmCampaign?: string;
        utmContent?: string;
        utmTerm?: string;
      };
    }) => void;
  };
}

const DEFAULT_UTM_SOURCE = "outboundbd";
const DEFAULT_UTM_MEDIUM = "website";
const DEFAULT_UTM_CAMPAIGN = "agencies";

/**
 * `hide_event_type_details`/`hide_gdpr_banner` are Calendly's own documented
 * embed customization options — passed as query params on the `url` itself
 * (that's how Calendly's API reads them, not as a separate options key).
 * Non-sensitive display flags, so unlike `prefill` there's no reason to keep
 * them out of this URL — only name/email/personal data are barred from ever
 * appearing in a URL, per this component's own doc comment below.
 */
function buildEmbedUrl(): string {
  const url = new URL(STRATEGY_CALL_HREF);
  url.searchParams.set("hide_event_type_details", "1");
  url.searchParams.set("hide_gdpr_banner", "1");
  return url.toString();
}

interface CalendlyInlineEmbedProps {
  /**
   * Fixed per-landing-page identifier sent to Calendly as `utm_content` —
   * never personal data, just which page sent the visitor here. Each
   * landing page's own thank-you page passes its own value (this one:
   * "agencies-cold-email").
   */
  utmContent: string;
}

/**
 * Inline Calendly embed, prefilled with the name/email the lead form just
 * collected — passed via `consumeAgencyLeadPrefill()` (sessionStorage),
 * NEVER a URL query param: this page's own URL must stay exactly
 * `/agencies/thank-you`, because the Meta Pixel's PageView event reports
 * the current page URL to Meta on load, and a name/email in that URL would
 * leak straight into Meta's systems. Calendly's own `initInlineWidget` API
 * passes prefill data into its iframe programmatically, not through this
 * page's address bar. UTM attribution follows the same "programmatic API,
 * never our own URL" rule via Calendly's own `utm` option — sourced from
 * the visitor's first-touch UTM params (`getStoredAgencyAttribution()`,
 * captured on landing — see src/lib/agency-attribution.ts), which is itself
 * never anything but campaign metadata: no name, email, or other personal
 * data ever flows through this path.
 */
export function CalendlyInlineEmbed({ utmContent }: CalendlyInlineEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  // useCallback (not a plain function) because this closes over the
  // `utmContent` prop — a real reactive dependency, unlike containerRef
  // (stable by definition) or the module-level STRATEGY_CALL_HREF constant
  // this file used to be the only reactive input here before UTM support
  // was added, and needs to be a stable, dependency-tracked reference so
  // both the effect below and <Script onLoad> call the same function.
  const initWidget = useCallback(() => {
    const container = containerRef.current;
    const calendly = (window as unknown as CalendlyGlobal).Calendly;
    if (!container || !calendly || initializedRef.current) return;

    const prefill = consumeAgencyLeadPrefill();
    const attribution = getStoredAgencyAttribution();

    calendly.initInlineWidget({
      url: buildEmbedUrl(),
      parentElement: container,
      prefill: prefill ? { name: prefill.name, email: prefill.email } : undefined,
      utm: {
        utmSource: attribution.utmSource || DEFAULT_UTM_SOURCE,
        utmMedium: attribution.utmMedium || DEFAULT_UTM_MEDIUM,
        utmCampaign: attribution.utmCampaign || DEFAULT_UTM_CAMPAIGN,
        utmContent,
        ...(attribution.utmTerm ? { utmTerm: attribution.utmTerm } : {}),
      },
    });
    initializedRef.current = true;
  }, [utmContent]);

  useEffect(() => {
    // Covers the case where the Calendly script is already loaded (e.g. a
    // second visit this session) — next/script's onLoad only fires once
    // per actual script load, not on every mount.
    initWidget();
  }, [initWidget]);

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
        used here instead: `prefill`/`utm` have to reach Calendly without
        ever touching this page's URL, and this API doesn't need the class
        at all. `initInlineWidget` creates the iframe with no sizing of its
        own, so without the `[&>iframe]` rules below it falls back to the
        browser's bare default iframe size (150px).
      */}
      {/*
        650px at every breakpoint — re-verified empirically in-browser after
        600px (this component's previous value) turned out to still show an
        internal Calendly scrollbar with the time zone row cut off, on a
        real 1366x768 laptop. That's despite 600px genuinely having no
        internal scrollbar in this tool's own ~712-2133px-wide test
        environment: a 1366px-*physical*-resolution laptop very commonly
        runs at 125%/150% Windows display scaling, which drops the
        *effective* CSS viewport width well below 1366px — likely below the
        ~1232px threshold at which this page's Container (max-w-6xl) stops
        growing, giving Calendly's column meaningfully less width than this
        tool could reproduce directly. Confirmed the effect by forcibly
        resizing this container's own element via injected styles (not just
        relying on the outer window, which this tool's resize_window cannot
        reliably change): at a forced 600px column width, 600px of height
        left the calendar mid-render with the time zone row entirely
        missing and a genuine scroll affordance visible on the card's own
        right edge (distinguishable from the page's own outer scrollbar,
        which spans the full page height, not just this card) — 630px was
        the shortest height with that affordance gone and the time zone row
        fully visible. Re-tested the same way at a 380px column (mobile
        width): 650px left a clean ~90px margin below the time zone row
        with no scroll affordance, more headroom than at 600px width, not
        less — so unlike the last version of this comment, width doesn't
        need its own separate, larger number here: one value covers the
        full range tested. The page itself may still scroll past a 768px
        viewport to reach the bottom of the calendar; only Calendly's own
        internal scroll is being avoided here.
      */}
      <div
        ref={containerRef}
        className="h-[650px] w-full [&>iframe]:h-full [&>iframe]:w-full [&>iframe]:border-0"
      />
    </>
  );
}
