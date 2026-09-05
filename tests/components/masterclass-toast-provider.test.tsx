// @vitest-environment jsdom
/**
 * Mounts the REAL HeroUI toast provider and calls the REAL global `toast`
 * singleton — unlike registration-form.test.tsx, which deliberately mocks
 * `@heroui/react`'s `toast` to unit-test the form's own logic (what's
 * called, when). This file exists to prove the actual library integration
 * (provider + compound API + variant styling) genuinely works, not just
 * that the form calls a mock correctly.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { Toast, toast } from "@heroui/react";

/*
 * `toast`'s underlying queue is a module-level singleton (react-stately),
 * independent of React's component tree — RTL's `cleanup()` unmounts each
 * test's <Toast.Provider/>, but a toast already added to the queue survives
 * that unmount and would reappear (stacked) the moment the next test's
 * fresh provider mounts. Must be cleared explicitly between tests.
 */
beforeEach(() => {
  toast.clear();
});

/**
 * jsdom has never implemented `window.matchMedia` — HeroUI's `ToastProvider`
 * calls it via `useMediaQuery("(max-width: 768px)")` to adapt toast width on
 * mobile. This is a generic jsdom gap (same category as the
 * `HTMLDialogElement` polyfill in `component-test-setup.ts`), scoped to this
 * file only since no other test file exercises a component that calls
 * `matchMedia`.
 */
beforeAll(() => {
  if (typeof window.matchMedia !== "function") {
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
  }
  /* jsdom has no layout engine and never implements ResizeObserver — each Toast measures its own height with it (via useMeasuredHeight) purely for stacking/scale math that has no visible effect in this text-content/class assertion test. */
  if (typeof window.ResizeObserver !== "function") {
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof window.ResizeObserver;
  }
});

function Harness() {
  return (
    <div>
      <button type="button" onClick={() => toast.success("পেমেন্ট তথ্য সফলভাবে জমা হয়েছে।")}>
        Fire success
      </button>
      <button type="button" onClick={() => toast.danger("পেমেন্ট তথ্য জমা দেওয়া যায়নি।")}>
        Fire danger
      </button>
      {/* The compound `Toast.Provider` API — confirmed to exist on the installed
          @heroui/react@3.2.4 package (components/toast/index.js attaches
          `Provider` onto the `Toast` function as a genuine compound component,
          not a legacy/mismatched API) and to be the only provider mounted for
          this harness. */}
      <Toast.Provider placement="top" />
    </div>
  );
}

describe("HeroUI Toast — real provider integration (no mocking)", () => {
  it("renders a visible success toast, with the library's own success-variant class, after toast.success() is called", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Fire success" }));

    const message = await screen.findByText("পেমেন্ট তথ্য সফলভাবে জমা হয়েছে।");
    expect(message).toBeInTheDocument();

    const toastEl = document.querySelector('[data-slot="toast"]');
    expect(toastEl).not.toBeNull();
    expect(toastEl?.className).toContain("toast--success");
  });

  it("renders a visible danger toast, with the library's own danger-variant class, after toast.danger() is called", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Fire danger" }));

    const message = await screen.findByText("পেমেন্ট তথ্য জমা দেওয়া যায়নি।");
    expect(message).toBeInTheDocument();

    const toastEl = document.querySelector('[data-slot="toast"]');
    expect(toastEl).not.toBeNull();
    expect(toastEl?.className).toContain("toast--danger");
  });

  it("success and danger toasts carry genuinely different variant classes (real styling differentiation, not just different text)", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Fire success" }));
    await screen.findByText("পেমেন্ট তথ্য সফলভাবে জমা হয়েছে।");
    const successClass = document.querySelector('[data-slot="toast"]')?.className;

    toast.clear();

    await user.click(screen.getByRole("button", { name: "Fire danger" }));
    await screen.findByText("পেমেন্ট তথ্য জমা দেওয়া যায়নি।");
    const dangerClass = document.querySelector('[data-slot="toast"]')?.className;

    expect(successClass).toContain("toast--success");
    expect(dangerClass).toContain("toast--danger");
    expect(successClass).not.toBe(dangerClass);
  });

  it("exactly one toast region is rendered by the single mounted provider", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Fire success" }));
    await screen.findByText("পেমেন্ট তথ্য সফলভাবে জমা হয়েছে।");

    // `data-slot="toast-region"` is the whole live-region container HeroUI's
    // ToastProvider renders — exactly one, matching exactly one
    // <Toast.Provider /> mounted in this tree.
    const regions = document.querySelectorAll('[data-slot="toast-region"]');
    expect(regions.length).toBe(1);
  });
});
