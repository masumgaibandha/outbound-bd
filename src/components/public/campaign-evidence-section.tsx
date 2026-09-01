"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { cn } from "tailwind-variants";

import {
  CATEGORY_LABELS,
  type CampaignEvidenceItem,
} from "@/components/public/campaign-evidence-data";
import { CampaignEvidenceLightbox } from "@/components/public/campaign-evidence-lightbox";
import { ExpandIcon } from "@/components/public/icons";

type CampaignEvidenceSectionProps = {
  items: readonly CampaignEvidenceItem[];
};

export function CampaignEvidenceSection({ items }: CampaignEvidenceSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const triggerRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleClose() {
    const previousIndex = openIndex;
    setOpenIndex(null);
    if (previousIndex !== null) {
      // The lightbox unmounts on close, so wait a frame before returning
      // focus to the thumbnail that opened it.
      requestAnimationFrame(() => triggerRefs.current[previousIndex]?.focus());
    }
  }

  return (
    <>
      <ul className="grid gap-6 md:grid-cols-2">
        {items.map((item, index) => {
          // An odd number of cards would otherwise leave the last one
          // stranded alone in the left column — instead it spans both
          // columns and switches to a wide, side-by-side layout.
          const spanFull = items.length % 2 === 1 && index === items.length - 1;

          return (
            <li
              key={item.id}
              data-reveal
              className={spanFull ? "md:col-span-2" : undefined}
            >
              <article
                className={cn(
                  "card-static border-hairline bg-surface flex h-full flex-col overflow-hidden border",
                  spanFull && "md:flex-row",
                )}
              >
                <button
                  ref={(el) => {
                    triggerRefs.current[index] = el;
                  }}
                  type="button"
                  onClick={() => setOpenIndex(index)}
                  aria-label={`Enlarge screenshot — ${item.alt}`}
                  className={cn(
                    "group bg-canvas-alt border-hairline focus-visible:outline-action relative flex shrink-0 items-center justify-center border-b p-5 focus-visible:outline-2 focus-visible:-outline-offset-2 md:p-6",
                    spanFull && "md:w-1/2 md:border-r md:border-b-0",
                  )}
                >
                  <Image
                    src={item.src}
                    alt=""
                    unoptimized
                    className="h-auto w-full rounded-md"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-5 flex items-center justify-center rounded-md bg-ink/0 opacity-0 transition-[background-color,opacity] duration-200 group-hover:bg-ink/35 group-hover:opacity-100 group-focus-visible:bg-ink/35 group-focus-visible:opacity-100 motion-reduce:transition-none md:inset-6"
                  >
                    <span className="bg-surface text-ink inline-flex size-11 items-center justify-center rounded-full shadow-md">
                      <ExpandIcon width={20} height={20} aria-hidden="true" />
                    </span>
                  </span>
                </button>

                <div
                  className={cn(
                    "flex flex-1 flex-col p-7 md:p-8",
                    spanFull && "md:justify-center md:p-10",
                  )}
                >
                  <p className="text-ink-muted mb-4 text-xs">Click to enlarge</p>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="text-ink-muted text-xs font-semibold tracking-[0.12em] uppercase">
                      {CATEGORY_LABELS[item.category]}
                    </span>
                    <span className="border-hairline text-ink-muted rounded-full border px-2.5 py-1 text-xs font-medium">
                      {item.platform}
                    </span>
                  </div>
                  <p className="text-ink leading-relaxed">{item.caption}</p>
                  {item.note ? (
                    <p className="text-ink-muted mt-3 text-sm leading-relaxed italic">
                      {item.note}
                    </p>
                  ) : null}
                </div>
              </article>
            </li>
          );
        })}
      </ul>

      {openIndex !== null ? (
        <CampaignEvidenceLightbox
          items={items}
          activeIndex={openIndex}
          onClose={handleClose}
          onNavigate={setOpenIndex}
        />
      ) : null}
    </>
  );
}
