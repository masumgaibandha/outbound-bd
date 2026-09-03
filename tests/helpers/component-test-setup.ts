import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Applies to every test file (setupFiles is global), but jest-dom's matchers
// and RTL's cleanup are no-ops for the node-environment API/lib suites that
// never render anything — safe to share rather than duplicating this file
// per test directory.
afterEach(() => {
  cleanup();
});

/*
 * jsdom (as of the version pinned here) still doesn't implement
 * `HTMLDialogElement.showModal()`/`close()` — both the agency and
 * masterclass evidence lightboxes (`evidence-lightbox.tsx`) use a native
 * <dialog> for its built-in top-layer/focus-trap/Escape behavior, so any
 * jsdom component test that opens one needs this. A minimal, spec-shaped
 * polyfill (toggle the `open` attribute/property; `close()` fires a real
 * `close` event, since `EvidenceLightbox` wires its `onClose` prop to
 * exactly that native event) is enough for RTL/user-event interaction
 * tests — it doesn't attempt the browser's actual top-layer/paint behavior,
 * which jsdom has no layout engine for anyway. Guarded so a future jsdom
 * release that adds real support isn't silently overridden.
 */
if (typeof HTMLDialogElement !== "undefined") {
  if (typeof HTMLDialogElement.prototype.showModal !== "function") {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute("open", "");
      // Real browsers close a modal <dialog> on Escape natively (no app JS
      // involved) — replicate just enough of that default action for
      // Escape-to-close to be testable here. Listening on `document` rather
      // than the dialog itself: a *real* modal dialog's native focus trap
      // guarantees focus can never land outside it, so listening on the
      // dialog would be equivalent there — but this polyfill doesn't (and
      // isn't trying to) implement that trap, and a test can legitimately
      // move focus to an element outside the dialog (e.g. simulating the
      // trigger being removed from the DOM via an outside "remove" button).
      // Escape must still close the topmost open dialog in that case.
      const onKeydown = (event: KeyboardEvent) => {
        if (event.key === "Escape" && this.open) {
          event.preventDefault();
          this.close();
        }
      };
      document.addEventListener("keydown", onKeydown);
      this.addEventListener("close", () => document.removeEventListener("keydown", onKeydown), { once: true });
    };
  }
  if (typeof HTMLDialogElement.prototype.close !== "function") {
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    };
  }
}
