"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "tailwind-variants";

import { ExpandIcon } from "@/components/public/icons";
import { EvidenceLightbox, type EvidenceLightboxLabels } from "@/components/public/evidence-lightbox";
import { toBengaliDigits } from "@/lib/masterclass/format";
import type { ProofAsset } from "@/types/masterclass";

type MasterclassEvidenceGalleryProps = {
  assets: readonly ProofAsset[];
  enlargeHintLabel: string;
};

const LIGHTBOX_LABELS: EvidenceLightboxLabels = {
  close: "বন্ধ করুন",
  previous: "আগের ছবি",
  next: "পরের ছবি",
  position: (current, total) => `${toBengaliDigits(String(current))} / ${toBengaliDigits(String(total))}`,
};

/** The active lightbox index plus the exact button that opened it — the two travel together so navigation (which only ever replaces `index`) can never touch `trigger`. */
type OpenLightboxState = { index: number; trigger: HTMLElement } | null;

/**
 * The 5 audited Outbound BD campaign/inbox-placement/sender-health
 * screenshots, as a 1-col (mobile) / 2-col (tablet+) grid with
 * click-to-enlarge — reuses the same shared `EvidenceLightbox` the agency
 * `/results` page uses (see `campaign-evidence-lightbox.tsx`), just with
 * Bengali labels and no category/platform badges. Deliberately does NOT
 * render `resultsProof.clientFeedback` (the Upwork review screenshot) —
 * that asset keeps its separate, unchanged "open in a new tab" rendering in
 * `ResultsProof.tsx`.
 */
export function MasterclassEvidenceGallery({ assets, enlargeHintLabel }: MasterclassEvidenceGalleryProps) {
  const [openState, setOpenState] = useState<OpenLightboxState>(null);

  return (
    <>
      <ul className="mt-8 grid gap-6 md:grid-cols-2">
        {assets.map((asset, index) => {
          // An odd number of cards would otherwise leave the last one
          // stranded alone in the left column — instead it spans both
          // columns and switches to a balanced, wide side-by-side layout.
          const spanFull = assets.length % 2 === 1 && index === assets.length - 1;

          return (
            <li key={asset.id} className={spanFull ? "md:col-span-2" : undefined}>
              <figure
                className={cn(
                  "border-hairline bg-surface flex h-full flex-col overflow-hidden border",
                  spanFull && "md:flex-row",
                )}
              >
                <button
                  type="button"
                  onClick={(event) => setOpenState({ index, trigger: event.currentTarget })}
                  aria-label={`${enlargeHintLabel} — ${asset.alt}`}
                  className={cn(
                    "group bg-canvas-alt border-hairline focus-visible:outline-action relative block w-full shrink-0 border-b p-5 focus-visible:outline-2 focus-visible:-outline-offset-2",
                    spanFull && "md:w-1/2 md:border-r md:border-b-0",
                  )}
                >
                  <div className="relative h-72 overflow-hidden rounded-sm sm:h-96">
                    <Image
                      src={asset.src}
                      alt=""
                      fill
                      unoptimized
                      sizes={
                        spanFull
                          ? "(min-width: 768px) 620px, 100vw"
                          : "(min-width: 768px) 440px, 100vw"
                      }
                      className="object-contain"
                    />
                  </div>
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-5 flex items-center justify-center rounded-sm bg-ink/0 opacity-0 transition-[background-color,opacity] duration-200 group-hover:bg-ink/35 group-hover:opacity-100 group-focus-visible:bg-ink/35 group-focus-visible:opacity-100 motion-reduce:transition-none"
                  >
                    <span className="bg-surface text-ink inline-flex size-11 items-center justify-center rounded-full shadow-md">
                      <ExpandIcon width={20} height={20} aria-hidden="true" />
                    </span>
                  </span>
                </button>

                <div
                  className={cn(
                    "flex flex-1 flex-col p-5",
                    spanFull && "md:justify-center md:p-8",
                  )}
                >
                  <figcaption className="text-ink-muted font-bengali text-sm leading-relaxed">
                    {asset.caption}
                  </figcaption>
                  {asset.note ? (
                    <p className="text-ink-muted font-bengali mt-2 text-sm leading-relaxed italic">
                      {asset.note}
                    </p>
                  ) : null}
                  <p className="text-ink-muted font-bengali mt-3 text-xs">{enlargeHintLabel}</p>
                </div>
              </figure>
            </li>
          );
        })}
      </ul>

      {openState ? (
        <EvidenceLightbox
          items={assets}
          activeIndex={openState.index}
          triggerElement={openState.trigger}
          onClose={() => setOpenState(null)}
          onNavigate={(nextIndex) =>
            setOpenState((prev) => (prev ? { ...prev, index: nextIndex } : prev))
          }
          labels={LIGHTBOX_LABELS}
        />
      ) : null}
    </>
  );
}
