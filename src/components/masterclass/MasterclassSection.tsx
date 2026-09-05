import { cn } from "tailwind-variants";
import type { ReactNode } from "react";

import { Container } from "@/components/public/container";

export type MasterclassSectionTone = "canvas" | "canvasAlt" | "dark";

const toneClasses: Record<MasterclassSectionTone, string> = {
  canvas: "bg-canvas",
  canvasAlt: "bg-canvas-alt",
  dark: "bg-ink text-on-dark",
};

interface MasterclassSectionProps {
  id: string;
  children: ReactNode;
  tone?: MasterclassSectionTone;
  className?: string;
  labelledBy?: string;
}

/**
 * Tighter vertical rhythm than the homepage's `Section` (`py-24 md:py-32`) —
 * a sales page reads faster and denser than the editorial agency site. Kept
 * local to `masterclass/` rather than changing the shared component.
 * Ported from the MasumDev masterclass source.
 */
export function MasterclassSection({
  id,
  children,
  tone = "canvas",
  className,
  labelledBy,
}: MasterclassSectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn("py-14 md:py-20", toneClasses[tone], className)}
    >
      <Container>{children}</Container>
    </section>
  );
}

export const eyebrowClass =
  "text-ink-muted flex items-center gap-3 text-xs font-semibold tracking-[0.14em] uppercase";

export const eyebrowDotClass = "bg-action h-px w-8 shrink-0";

/**
 * Numeric text — prices, payment phone/account numbers, transaction IDs, and
 * public registration/order references. Always the project's clean
 * sans-serif face (`font-sans`, i.e. Poppins — never the serif heading font
 * or the Bengali face), with lining, tabular figures so digits share a fixed
 * width and align on a common baseline instead of jiggling as they change.
 * Never applied to Bengali dates or body copy — those keep their existing
 * Bengali-digit rendering (`toBengaliDigits()` in `format.ts`) untouched.
 */
export const numericTextClass = "font-sans tabular-nums lining-nums";
