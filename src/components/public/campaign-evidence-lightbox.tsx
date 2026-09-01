"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

import {
  CATEGORY_LABELS,
  type CampaignEvidenceItem,
} from "@/components/public/campaign-evidence-data";
import { ArrowLeftIcon, ArrowRightIcon, XIcon } from "@/components/public/icons";

type CampaignEvidenceLightboxProps = {
  items: readonly CampaignEvidenceItem[];
  activeIndex: number;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
};

/**
 * Native <dialog> rather than a hand-rolled overlay: showModal() gives us a
 * real top-layer, browser-managed focus trap, and Escape-to-close for free,
 * which covers most of the a11y surface a lightbox needs without a third-
 * party package. We still handle body-scroll locking, arrow-key navigation,
 * and explicit focus restoration ourselves — those aren't part of the
 * native contract.
 */
export function CampaignEvidenceLightbox({
  items,
  activeIndex,
  onClose,
  onNavigate,
}: CampaignEvidenceLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const item = items[activeIndex];

  // Opens the dialog and locks body scroll for its lifetime. Runs once —
  // re-running per activeIndex change would re-lock/unlock scroll on every
  // prev/next click.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    function getFocusable(container: HTMLDialogElement) {
      return Array.from(
        container.querySelectorAll<HTMLElement>("button"),
      ).filter((el) => el.offsetParent !== null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onNavigate((activeIndex - 1 + items.length) % items.length);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        onNavigate((activeIndex + 1) % items.length);
        return;
      }
      // Chromium's native <dialog> focus trap has a real gap: tabbing
      // forward past the last focusable control lands on <body> and
      // sticks there (confirmed via automated focus testing — it doesn't
      // wrap back on its own, and no focusin event fires for that
      // transition either, so it can't be caught after the fact). Handle
      // Tab manually at the boundary elements instead of relying on the
      // browser to wrap it.
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = getFocusable(dialogRef.current);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    dialog.addEventListener("keydown", handleKeyDown);
    return () => dialog.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, items.length, onNavigate]);

  const titleId = "evidence-lightbox-title";
  const descId = "evidence-lightbox-desc";

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="evidence-lightbox border-hairline bg-surface fixed inset-0 m-auto h-[100dvh] max-h-none w-[100vw] max-w-none rounded-none border-0 p-0 shadow-2xl backdrop:bg-ink/80 sm:h-auto sm:max-h-[88vh] sm:w-[92vw] sm:max-w-5xl sm:rounded-2xl sm:border"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current?.close();
      }}
    >
      <div className="flex h-full max-h-[100dvh] flex-col sm:max-h-[88vh]">
        <div className="border-hairline flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-ink-muted font-semibold tracking-[0.12em] uppercase">
              {CATEGORY_LABELS[item.category]}
            </span>
            <span className="border-hairline text-ink-muted rounded-full border px-2.5 py-1 font-medium">
              {item.platform}
            </span>
            <span className="text-ink-muted" aria-hidden="true">
              ·
            </span>
            <span className="text-ink-muted">
              {activeIndex + 1} of {items.length}
            </span>
          </div>
          <button
            type="button"
            autoFocus
            onClick={() => dialogRef.current?.close()}
            aria-label="Close enlarged image"
            className="border-hairline text-ink hover:border-action hover:text-action focus-visible:outline-action inline-flex size-10 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <XIcon width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        <div className="bg-canvas-alt relative flex min-h-0 flex-1 items-center justify-center p-4 sm:p-8">
          {items.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() =>
                  onNavigate((activeIndex - 1 + items.length) % items.length)
                }
                aria-label="Previous result"
                className="bg-surface/90 text-ink hover:text-action focus-visible:outline-action absolute top-1/2 left-2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full shadow-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 sm:left-4"
              >
                <ArrowLeftIcon width={18} height={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate((activeIndex + 1) % items.length)}
                aria-label="Next result"
                className="bg-surface/90 text-ink hover:text-action focus-visible:outline-action absolute top-1/2 right-2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full shadow-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 sm:right-4"
              >
                <ArrowRightIcon width={18} height={18} aria-hidden="true" />
              </button>
            </>
          ) : null}

          <Image
            key={item.id}
            src={item.src}
            alt={item.alt}
            unoptimized
            sizes="(min-width: 640px) 85vw, 100vw"
            className="h-auto max-h-full w-auto max-w-full rounded-md object-contain"
          />
        </div>

        <div className="border-hairline border-t px-4 py-4 sm:px-6">
          <h2 id={titleId} className="sr-only">
            {item.alt}
          </h2>
          <p id={descId} className="text-ink text-sm leading-relaxed sm:text-base">
            {item.caption}
          </p>
          {item.note ? (
            <p className="text-ink-muted mt-2 text-xs leading-relaxed italic sm:text-sm">
              {item.note}
            </p>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}
