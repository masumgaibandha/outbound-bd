"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Flips `data-revealed` on every `[data-reveal]` element as it scrolls into
 * view. A single page-level observer rather than a wrapper component, so
 * section markup stays server-rendered and free of client boundaries.
 * Content is visible without JS; the CSS only hides it when motion is
 * allowed and this script is running (see globals.css).
 *
 * Mounted once in the root layout, which does not remount on client-side
 * navigation — so the effect re-runs on `pathname` change to pick up the
 * new page's `[data-reveal]` elements rather than only scanning once.
 */
export function RevealOnScroll() {
  const pathname = usePathname();

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const targets = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      targets.forEach((el) => el.setAttribute("data-revealed", "true"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.setAttribute("data-revealed", "true");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
