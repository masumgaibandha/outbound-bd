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
        lg: 600px verified empirically in-browser (not derived from a spec)
        as the shortest value that renders the full date picker + time zone
        selector with no internal Calendly scrollbar, at the ~712px column
        width this page's desktop two-column layout gives it at a 1366px+
        viewport (Container caps at max-w-6xl, so 1366px and wider render
        identically) — now that hide_event_type_details=1 removes the
        event-description block that previously dominated the card's
        height. The page itself may still scroll past a 768px viewport to
        reach the very bottom of the time zone selector; only Calendly's own
        internal scroll is being avoided here.
        Below lg: 650px, a deliberate margin above the proven 600px rather
        than an equally-verified number — this tool's browser environment
        couldn't be resized to a genuine mobile viewport to confirm the
        tighter value the same way, and the calendar grid/time-zone-selector
        content this holds doesn't vary with width the way the (now hidden)
        event description did, so the desktop figure plus headroom for
        narrower text wrapping is the safer bet. Re-verify on a real device
        before relying on this being minimal.
      */}
      <div
        ref={containerRef}
        className="h-[650px] w-full [&>iframe]:h-full [&>iframe]:w-full [&>iframe]:border-0 lg:h-[600px]"
      />
    </>
  );
}
