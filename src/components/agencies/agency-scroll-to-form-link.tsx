"use client";

import type { MouseEvent, ReactNode } from "react";

import { GET_DETAILS_ID } from "@/components/agencies/agency-anchors";
import { buttonClass, type ButtonTone } from "@/components/public/button";

type AgencyScrollToFormLinkProps = {
  children: ReactNode;
  tone?: ButtonTone;
  size?: "md" | "lg";
  fullWidth?: boolean;
  className?: string;
};

/**
 * A plain `#get-details` anchor (so it still works with JS off), upgraded to
 * a smooth scroll on click. Done per click rather than with a global
 * `scroll-behavior: smooth` rule so the form's own `router.push()` to the
 * thank-you page never inherits a slow animated scroll-to-top, and so
 * visitors who prefer reduced motion get an instant jump.
 */
export function AgencyScrollToFormLink({
  children,
  tone = "action",
  size = "lg",
  fullWidth = false,
  className,
}: AgencyScrollToFormLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    const target = document.getElementById(GET_DETAILS_ID);
    if (!target) return;
    event.preventDefault();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    window.history.replaceState(null, "", `#${GET_DETAILS_ID}`);
  }

  return (
    <a
      href={`#${GET_DETAILS_ID}`}
      onClick={handleClick}
      className={buttonClass({ tone, size, fullWidth, className })}
    >
      {children}
    </a>
  );
}
