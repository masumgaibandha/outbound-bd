import { stickyCta } from "@/data/masterclass-content";
import { formatBDT } from "@/lib/masterclass/format";

interface StickyMobileCtaProps {
  priceBDT: number;
}

/**
 * CSS-only — `position: fixed` + `md:hidden`, no scroll listener, no Client
 * Component. `page.tsx` reserves matching bottom padding on mobile so this
 * bar never covers the registration form or footer. Ported from the
 * MasumDev masterclass source.
 */
export function StickyMobileCta({ priceBDT }: StickyMobileCtaProps) {
  return (
    <div
      className="border-hairline bg-canvas fixed inset-x-0 bottom-0 z-40 border-t md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <a
        href="#registration"
        className="bg-action active:bg-action-hover focus-visible:outline-action font-bengali flex items-center justify-center gap-2 px-4 py-4 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:-outline-offset-4"
      >
        <span>{formatBDT(priceBDT)}</span>
        <span aria-hidden="true">•</span>
        <span>{stickyCta.label}</span>
      </a>
    </div>
  );
}
