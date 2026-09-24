"use client";

import { buttonClass } from "@/components/public/button";
import { STRATEGY_CALL_HREF, STRATEGY_CALL_LINK_PROPS } from "@/components/public/site-config";
import { fireAgencyContactPixelEvent } from "@/lib/tracking/fire-contact-pixel-event";

/**
 * The hero's secondary CTA. Destination and new-tab props come from
 * site-config.ts (the one place the Calendly URL lives); the visible label
 * is this page's own exact copy. A click is a "Contact" signal only, never
 * a "Lead": a lead is a submitted form, fired by `AgencyLeadForm` alone.
 */
export function AgencyBookACallButton() {
  return (
    <a
      href={STRATEGY_CALL_HREF}
      {...STRATEGY_CALL_LINK_PROPS}
      onClick={() => fireAgencyContactPixelEvent()}
      className={buttonClass({ tone: "outline", size: "lg" })}
    >
      Book a call
    </a>
  );
}
