import Image from "next/image";

import lockupOnCanvas from "@/assets/logos/outbound-bd-lockup-transparent.png";
import lockupOnDark from "@/assets/logos/outbound-bd-lockup-white-transparent.png";
import lockupCream from "@/assets/logos/outbound-bd-lockup-cream-transparent.png";
import lockupInk from "@/assets/logos/outbound-bd-lockup-ink-transparent.png";
import markOnCanvas from "@/assets/logos/outbound-bd-mark-transparent.png";
import markOnDark from "@/assets/logos/outbound-bd-mark-white-transparent.png";

type LogoProps = {
  /** Which background this logo will sit on, so the correct brand-color asset is used. */
  surface?: "canvas" | "dark";
  /** Full lockup (mark + wordmark) or the mark alone. Monochrome is lockup-only. */
  variant?: "lockup" | "mark";
  /** "brand" (ink/terracotta or cream/terracotta) or a flat single-color monochrome. */
  tone?: "brand" | "monochrome";
  className?: string;
  priority?: boolean;
};

const BRAND_SOURCES = {
  canvas: { lockup: lockupOnCanvas, mark: markOnCanvas },
  dark: { lockup: lockupOnDark, mark: markOnDark },
} as const;

// Monochrome only exists for the full lockup — the standalone mark has no
// wordmark to distinguish from its own color, so "monochrome mark" would be
// visually identical to the brand mark's terracotta ring/dot anyway.
const MONOCHROME_SOURCES = {
  canvas: lockupInk,
  dark: lockupCream,
} as const;

export function Logo({
  surface = "canvas",
  variant = "lockup",
  tone = "brand",
  className,
  priority,
}: LogoProps) {
  const src =
    tone === "monochrome"
      ? MONOCHROME_SOURCES[surface]
      : BRAND_SOURCES[surface][variant];

  return (
    <Image
      src={src}
      alt="Outbound BD"
      // Small, already-optimized static PNGs — skip /_next/image so the
      // logo never depends on Vercel's metered image-optimization quota.
      unoptimized
      className={className}
      priority={priority}
    />
  );
}
