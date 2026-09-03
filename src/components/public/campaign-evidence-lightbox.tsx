"use client";

import {
  CATEGORY_LABELS,
  type CampaignEvidenceItem,
} from "@/components/public/campaign-evidence-data";
import { EvidenceLightbox } from "@/components/public/evidence-lightbox";

type CampaignEvidenceLightboxProps = {
  items: readonly CampaignEvidenceItem[];
  activeIndex: number;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
  /** The exact thumbnail button that opened this lightbox — see the doc comment on `EvidenceLightbox`'s `triggerElement` prop. */
  triggerElement: HTMLElement | null;
};

/** Thin, type-specific wrapper around the shared `EvidenceLightbox` — adds this page's category/platform badges, everything else (dialog, focus trap, scroll lock, keyboard nav, trigger-focus restoration) is the generic implementation. */
export function CampaignEvidenceLightbox({
  items,
  activeIndex,
  onClose,
  onNavigate,
  triggerElement,
}: CampaignEvidenceLightboxProps) {
  return (
    <EvidenceLightbox
      items={items}
      activeIndex={activeIndex}
      onClose={onClose}
      onNavigate={onNavigate}
      triggerElement={triggerElement}
      renderMeta={(item) => (
        <>
          <span className="text-ink-muted font-semibold tracking-[0.12em] uppercase">
            {CATEGORY_LABELS[item.category]}
          </span>
          <span className="border-hairline text-ink-muted rounded-full border px-2.5 py-1 font-medium">
            {item.platform}
          </span>
        </>
      )}
    />
  );
}
