"use client";

import Image, { type StaticImageData } from "next/image";
import { type ReactNode, useEffect, useRef } from "react";

import { ArrowLeftIcon, ArrowRightIcon, XIcon } from "@/components/public/icons";

/**
 * Generic evidence-lightbox item shape. Any concrete item type (the
 * agency's `CampaignEvidenceItem`, the masterclass's `ProofAsset`) is
 * compatible as long as it carries at least these fields.
 */
export interface EvidenceLightboxItem {
  id: string;
  src: string | StaticImageData;
  alt: string;
  caption: string;
  note?: string;
}

export interface EvidenceLightboxLabels {
  /** Accessible name for the close button. */
  close: string;
  /** Accessible name for the previous-item button. */
  previous: string;
  /** Accessible name for the next-item button. */
  next: string;
  /** Visible (and accessible, via the live text node) position indicator, e.g. "1 of 5". */
  position: (current: number, total: number) => string;
}

const DEFAULT_LABELS: EvidenceLightboxLabels = {
  close: "Close enlarged image",
  previous: "Previous result",
  next: "Next result",
  position: (current, total) => `${current} of ${total}`,
};

type EvidenceLightboxProps<T extends EvidenceLightboxItem> = {
  items: readonly T[];
  activeIndex: number;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
  /**
   * The exact element to return focus to when this lightbox closes —
   * captured explicitly by the caller via `event.currentTarget` in the
   * thumbnail's own `onClick` handler, BEFORE opening the lightbox (see
   * `MasterclassEvidenceGallery`/`campaign-evidence-section.tsx`), and
   * carried in the caller's own open-state alongside the active index so
   * `onNavigate` changing the index can never touch it.
   *
   * Deliberately NOT read from `document.activeElement` inside this
   * component: that would depend on live, mutable browser state at
   * whatever instant this component happens to render or commit, which is
   * exactly the kind of impure read that breaks under React Strict Mode's
   * double-invoked renders and under interrupted/concurrent rendering, and
   * would only keep working today by accident of React's current
   * `autoFocus` timing. An explicit prop has none of that: it's an
   * ordinary, immutable value for this render, supplied by an event
   * handler outside of render, like any other piece of caller state.
   *
   * `null`, or an element that has since become disconnected, disabled, or
   * hidden, is handled safely on close — see `isRestorableFocusTarget()`.
   */
  triggerElement: HTMLElement | null;
  /**
   * Optional badges/meta rendered before the position indicator — e.g. the
   * category + platform pills on the agency evidence lightbox. Omit for a
   * plain lightbox with just a position indicator (the masterclass gallery).
   */
  renderMeta?: (item: T) => ReactNode;
  /** Overrides for any of the default (English) accessible labels — a caller in another language must supply all four. */
  labels?: EvidenceLightboxLabels;
};

/**
 * Guards the close-time `.focus()` call against every way the caller-owned
 * trigger element could have stopped being a valid focus target since it
 * was captured: never captured (`null`), removed from the document,
 * `disabled`, or hidden (the `hidden` attribute or a CSS-hidden ancestor).
 * Not an exhaustive "is this element focusable" check (e.g. `tabIndex`
 * isn't consulted) — every real trigger is a plain `<button>`, which is
 * natively focusable whenever none of these disqualify it.
 */
function isRestorableFocusTarget(el: HTMLElement | null): el is HTMLElement {
  if (!el) return false;
  if (!el.isConnected) return false;
  if (el.hasAttribute("disabled")) return false;
  if (el.hidden) return false;
  try {
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") return false;
  } catch {
    return false;
  }
  return true;
}

/**
 * Native <dialog> rather than a hand-rolled overlay: showModal() gives us a
 * real top-layer, browser-managed focus trap, and Escape-to-close for free,
 * which covers most of the a11y surface a lightbox needs without a third-
 * party package. We still handle body-scroll locking, arrow-key navigation,
 * and explicit focus restoration ourselves — those aren't part of the
 * native contract. Generalized from the agency results-page lightbox so
 * every evidence gallery on the site (agency `/results`, the masterclass
 * sales page) shares one implementation instead of duplicating this a11y
 * surface — see `campaign-evidence-lightbox.tsx` for the agency's own thin
 * wrapper around this component.
 */
export function EvidenceLightbox<T extends EvidenceLightboxItem>({
  items,
  activeIndex,
  onClose,
  onNavigate,
  triggerElement,
  renderMeta,
  labels = DEFAULT_LABELS,
}: EvidenceLightboxProps<T>) {
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

  /**
   * Wraps the caller's `onClose` so every close path — Escape (native
   * default action fires `close` directly), the close button and backdrop
   * click (both call `dialogRef.current.close()`, which fires the same
   * native `close` event) — restores focus to the caller-supplied
   * `triggerElement` through this one place, rather than each caller
   * re-implementing it. `triggerElement` is read here from this render's
   * props (an ordinary closure over a function argument, not a ref) —
   * scheduled a frame out, same as the pre-existing pattern this replaces,
   * so it doesn't fight the dialog's own close-time focus handling. The
   * caller is responsible for clearing its own stored trigger once
   * `onClose()` below runs (typically by resetting the open-state that
   * conditionally renders this component at all) — there's no ref here for
   * this component to null out itself.
   */
  function handleDialogClose() {
    requestAnimationFrame(() => {
      try {
        if (isRestorableFocusTarget(triggerElement)) {
          triggerElement.focus();
        }
      } catch {
        // A close path must never throw, however exotic the trigger's state.
      }
    });
    onClose();
  }

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
      onClose={handleDialogClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current?.close();
      }}
    >
      <div className="flex h-full max-h-[100dvh] flex-col sm:max-h-[88vh]">
        <div className="border-hairline flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {renderMeta ? (
              <>
                {renderMeta(item)}
                <span className="text-ink-muted" aria-hidden="true">
                  ·
                </span>
              </>
            ) : null}
            <span className="text-ink-muted">{labels.position(activeIndex + 1, items.length)}</span>
          </div>
          <button
            type="button"
            autoFocus
            onClick={() => dialogRef.current?.close()}
            aria-label={labels.close}
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
                aria-label={labels.previous}
                className="bg-surface/90 text-ink hover:text-action focus-visible:outline-action absolute top-1/2 left-2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full shadow-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 sm:left-4"
              >
                <ArrowLeftIcon width={18} height={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate((activeIndex + 1) % items.length)}
                aria-label={labels.next}
                className="bg-surface/90 text-ink hover:text-action focus-visible:outline-action absolute top-1/2 right-2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full shadow-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 sm:right-4"
              >
                <ArrowRightIcon width={18} height={18} aria-hidden="true" />
              </button>
            </>
          ) : null}

          <div className="pointer-events-none relative h-full w-full">
            {/*
             * `fill` rather than relying on intrinsic width/height: `src`
             * is `string | StaticImageData` (a plain path string for an
             * item like the masterclass's Upwork feedback asset, though
             * that one never reaches this lightbox — see
             * `MasterclassEvidenceGallery`'s doc comment), and Next can
             * only infer intrinsic dimensions for the latter. `fill` +
             * `object-contain` inside this fully-sized wrapper scales to
             * the largest size that fits without cropping either way.
             * `pointer-events-none` on the wrapper: unlike the old intrinsic-
             * sized <Image>, this div always covers the full container
             * (object-contain only affects the painted image, not the box's
             * hit-test area) — without this it silently intercepts clicks
             * on the prev/next buttons wherever the (larger) box overlaps
             * them, even though nothing here has a click handler of its own.
             */}
            <Image
              key={item.id}
              src={item.src}
              alt={item.alt}
              fill
              unoptimized
              sizes="(min-width: 640px) 85vw, 100vw"
              className="rounded-md object-contain"
            />
          </div>
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
