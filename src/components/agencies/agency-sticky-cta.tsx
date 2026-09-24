"use client";

import { useEffect, useState } from "react";
import { cn } from "tailwind-variants";

import { FINAL_CTA_ID, GET_DETAILS_ID, HERO_ID } from "@/components/agencies/agency-anchors";
import { AgencyScrollToFormLink } from "@/components/agencies/agency-scroll-to-form-link";

/**
 * Mobile-only sticky "Get the details" bar. Hidden while the hero is on
 * screen (its own button is right there), while the form section is on
 * screen (it would just cover the form), and again once the final CTA has
 * scrolled into view, where it would duplicate that button and sit on top
 * of the footer.
 *
 * The hero starts out counted as visible, since every normal page load
 * begins there: the bar stays hidden rather than flashing in before the
 * observer's first callback reports the real positions.
 */
export function AgencyStickyCta() {
  const [heroVisible, setHeroVisible] = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const [finalCtaReached, setFinalCtaReached] = useState(false);

  useEffect(() => {
    const hero = document.getElementById(HERO_ID);
    const form = document.getElementById(GET_DETAILS_ID);
    const finalCta = document.getElementById(FINAL_CTA_ID);
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === hero) {
          setHeroVisible(entry.isIntersecting);
        } else if (entry.target === form) {
          setFormVisible(entry.isIntersecting);
        } else if (entry.target === finalCta) {
          // Stays hidden past the final CTA too (scrolled above the top).
          setFinalCtaReached(entry.isIntersecting || entry.boundingClientRect.top < 0);
        }
      }
    });
    if (hero) observer.observe(hero);
    if (form) observer.observe(form);
    if (finalCta) observer.observe(finalCta);
    return () => observer.disconnect();
  }, []);

  const hidden = heroVisible || formVisible || finalCtaReached;

  return (
    <div
      data-testid="agency-sticky-cta"
      data-hidden={hidden ? "true" : "false"}
      aria-hidden={hidden}
      inert={hidden}
      className={cn(
        "border-hairline bg-canvas/95 fixed inset-x-0 bottom-0 z-30 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden",
        "transition-transform duration-300 ease-out motion-reduce:transition-none",
        hidden ? "translate-y-full" : "translate-y-0",
      )}
    >
      <AgencyScrollToFormLink size="md" fullWidth>
        Get the details
      </AgencyScrollToFormLink>
    </div>
  );
}
