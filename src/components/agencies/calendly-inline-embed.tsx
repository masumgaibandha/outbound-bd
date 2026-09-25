"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

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
      /** Programmatic equivalent of the class-embed's `data-resize="true"` — asks Calendly to report its real content height via a `calendly.page_height` postMessage as it changes. */
      resize?: boolean;
    }) => void;
  };
}

/**
 * Floor for the wrapper/iframe height — both the initial value (before any
 * `calendly.page_height` message has arrived) and a lower bound on every
 * value Calendly ever reports afterward. Verified empirically to already
 * fit the plain calendar/time-zone view with margin at every width tested,
 * 380px through 2133px.
 */
const MIN_HEIGHT_PX = 700;

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
  /** `utm_campaign` used only when the visitor arrived with none of their own. Defaults to "agencies". */
  defaultUtmCampaign?: string;
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
 *
 * Height is live, not a fixed guess: `resize: true` (the programmatic
 * equivalent of the class-embed's `data-resize="true"`) asks Calendly to
 * report its real content height, and this listens for the
 * `calendly.page_height` postMessage and applies it directly. Confirmed
 * live that this genuinely varies a lot by interaction state — the plain
 * calendar/time-zone view fits well under `MIN_HEIGHT_PX`, but selecting a
 * date that has many available slots can report over 2000px (Calendly
 * lists every slot for that day with no internal scroll of its own, so
 * that's the real height needed to show all of them). The wrapper grows to
 * match every time, so this page's own scroll is what reaches the rest of
 * a tall slot list — not a scrollbar inside the Calendly card. An earlier
 * version of this component used a single fixed height instead; a report
 * of a scrollbar *inside* the card on a real desktop, which this file's
 * own scrollHeight/clientHeight diagnostics couldn't reproduce (every
 * ancestor measured 0px of overflow), is what motivated switching to this
 * live-height approach instead of guessing a larger fixed number.
 */
export function CalendlyInlineEmbed({
  utmContent,
  defaultUtmCampaign = DEFAULT_UTM_CAMPAIGN,
}: CalendlyInlineEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const [height, setHeight] = useState(MIN_HEIGHT_PX);

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
        utmCampaign: attribution.utmCampaign || defaultUtmCampaign,
        utmContent,
        ...(attribution.utmTerm ? { utmTerm: attribution.utmTerm } : {}),
      },
      resize: true,
    });
    initializedRef.current = true;
  }, [utmContent, defaultUtmCampaign]);

  useEffect(() => {
    // Covers the case where the Calendly script is already loaded (e.g. a
    // second visit this session) — next/script's onLoad only fires once
    // per actual script load, not on every mount.
    initWidget();
  }, [initWidget]);

  useEffect(() => {
    function handlePageHeight(event: MessageEvent) {
      const data = event.data as { event?: string; payload?: { height?: unknown } } | undefined;
      if (data?.event !== "calendly.page_height") return;

      // Confirmed live: Calendly sends this as a numeric-looking *string*
      // ("2133px"), not a number — parseFloat reads the leading digits and
      // stops at "px", so this handles both that and a plain number the
      // same way rather than silently dropping every real message the way
      // a strict `typeof === "number"` check did during testing.
      const raw = data.payload?.height;
      const reported = typeof raw === "number" ? raw : typeof raw === "string" ? parseFloat(raw) : NaN;
      if (!Number.isFinite(reported)) return;

      const next = Math.max(MIN_HEIGHT_PX, Math.ceil(reported));
      setHeight(next);

      // Set directly on the iframe too, not just the wrapper — belt and
      // braces against the `[&>iframe]:h-full` CSS rule losing a
      // specificity fight with an inline style Calendly's own script might
      // set on the iframe it controls.
      const iframe = containerRef.current?.querySelector("iframe");
      if (iframe) iframe.style.height = `${next}px`;
    }

    window.addEventListener("message", handlePageHeight);
    return () => window.removeEventListener("message", handlePageHeight);
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
        used here instead: `prefill`/`utm` have to reach Calendly without
        ever touching this page's URL, and this API doesn't need the class
        at all. `initInlineWidget` creates the iframe with no sizing of its
        own, so without the `[&>iframe]` rules below it falls back to the
        browser's bare default iframe size (150px).
      */}
      {/*
        `height` (inline style, not a Tailwind class) is intentional — this
        value now comes from `calendly.page_height` at runtime, so it can't
        be a static utility class the way the old fixed-height version was.
        `overflow-hidden` stays as a hard guarantee this element specifically
        can never show its own scrollbar even in some edge case where a
        `page_height` message is missed or arrives late — with the resize
        listener now matching real content, this should never actually have
        anything to clip, but it costs nothing to keep as a backstop.
      */}
      <div
        ref={containerRef}
        style={{ height }}
        className="w-full overflow-hidden [&>iframe]:h-full [&>iframe]:w-full [&>iframe]:border-0"
      />
    </>
  );
}
