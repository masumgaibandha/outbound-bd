import { cn } from "tailwind-variants";
import type { ReactNode } from "react";

import { Container } from "@/components/public/container";

export type SectionTone = "canvas" | "canvasAlt" | "dark";

const toneClasses: Record<SectionTone, string> = {
  canvas: "bg-canvas",
  canvasAlt: "bg-canvas-alt",
  dark: "bg-ink text-on-dark",
};

type SectionProps = {
  id?: string;
  children: ReactNode;
  tone?: SectionTone;
  className?: string;
  labelledBy?: string;
  bleed?: boolean;
  /** Tighter rhythm for homepage teaser sections stacked closely together. */
  compact?: boolean;
};

/**
 * Owns vertical rhythm and banding for every section on the page —
 * individual sections should not set their own `py-*`.
 */
export function Section({
  id,
  children,
  tone = "canvas",
  className,
  labelledBy,
  bleed = false,
  compact = false,
}: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn(
        compact ? "py-16 md:py-20" : "py-20 md:py-28",
        toneClasses[tone],
        className,
      )}
    >
      {bleed ? children : <Container>{children}</Container>}
    </section>
  );
}
