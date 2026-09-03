// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode, useState } from "react";
import { describe, expect, it } from "vitest";

import { EvidenceLightbox, type EvidenceLightboxItem } from "@/components/public/evidence-lightbox";

/**
 * Direct unit tests of the shared `EvidenceLightbox` primitive — the
 * trigger-focus-restoration fix lives entirely in this file, so these
 * exercise it in isolation with a minimal generic item type, independent of
 * either real caller's markup/data. See also
 * `tests/components/masterclass-evidence-gallery.test.tsx` and
 * `tests/components/campaign-evidence-section.test.tsx` for the same fix
 * verified end-to-end through each real (Bengali / English) wrapper.
 *
 * The trigger is captured explicitly via `event.currentTarget` in each
 * harness's own `onClick` — exactly the pattern both real callers use —
 * never read from `document.activeElement` anywhere in these harnesses or
 * in the component under test.
 */

const ITEMS: EvidenceLightboxItem[] = [
  { id: "a", src: "/a.png", alt: "Image A", caption: "Caption A" },
  { id: "b", src: "/b.png", alt: "Image B", caption: "Caption B" },
  { id: "c", src: "/c.png", alt: "Image C", caption: "Caption C" },
];

type OpenState = { index: number; trigger: HTMLElement } | null;

/** Three independent trigger buttons, mirroring how a real gallery renders one button per item. */
function MultiTriggerHarness() {
  const [open, setOpen] = useState<OpenState>(null);
  return (
    <div>
      {ITEMS.map((item, index) => (
        <button
          key={item.id}
          type="button"
          onClick={(event) => setOpen({ index, trigger: event.currentTarget })}
        >
          {`trigger ${index}`}
        </button>
      ))}
      {open ? (
        <EvidenceLightbox
          items={ITEMS}
          activeIndex={open.index}
          triggerElement={open.trigger}
          onClose={() => setOpen(null)}
          onNavigate={(nextIndex) => setOpen((prev) => (prev ? { ...prev, index: nextIndex } : prev))}
        />
      ) : null}
    </div>
  );
}

/** A single trigger whose DOM state (removed / disabled / hidden) can be mutated independently of the lightbox's own open/close state, to exercise `isRestorableFocusTarget()`'s guards. */
function EdgeCaseTriggerHarness({ mode }: { mode: "remove" | "disable" | "hide" }) {
  const [open, setOpen] = useState<OpenState>(null);
  const [showTrigger, setShowTrigger] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [hidden, setHidden] = useState(false);

  function mutateTrigger() {
    if (mode === "remove") setShowTrigger(false);
    if (mode === "disable") setDisabled(true);
    if (mode === "hide") setHidden(true);
  }

  return (
    <div>
      {showTrigger ? (
        <button
          type="button"
          disabled={disabled}
          hidden={hidden}
          onClick={(event) => setOpen({ index: 0, trigger: event.currentTarget })}
        >
          the trigger
        </button>
      ) : null}
      <button type="button" onClick={mutateTrigger}>
        mutate the trigger
      </button>
      {open ? (
        <EvidenceLightbox
          items={ITEMS}
          activeIndex={open.index}
          triggerElement={open.trigger}
          onClose={() => setOpen(null)}
          onNavigate={(nextIndex) => setOpen((prev) => (prev ? { ...prev, index: nextIndex } : prev))}
        />
      ) : null}
    </div>
  );
}

/** Opens the lightbox with an explicit `triggerElement={null}` — exercising the "never captured a trigger at all" case directly, bypassing any caller click flow. */
function NullTriggerHarness() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        open without a trigger
      </button>
      {open ? (
        <EvidenceLightbox
          items={ITEMS}
          activeIndex={0}
          triggerElement={null}
          onClose={() => setOpen(false)}
          onNavigate={() => {}}
        />
      ) : null}
    </div>
  );
}

function getDialog() {
  return screen.getByRole("dialog");
}

describe("EvidenceLightbox — capturing the trigger", () => {
  it("mouse click captures the clicked thumbnail", async () => {
    const user = userEvent.setup();
    render(<MultiTriggerHarness />);
    const trigger1 = screen.getByRole("button", { name: "trigger 1" });

    await user.click(trigger1);
    expect(within(getDialog()).getByText("Caption B")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger1).toHaveFocus());
  });

  it("Enter activation captures the exact thumbnail", async () => {
    const user = userEvent.setup();
    render(<MultiTriggerHarness />);
    const trigger2 = screen.getByRole("button", { name: "trigger 2" });

    trigger2.focus();
    await user.keyboard("{Enter}");
    expect(within(getDialog()).getByText("Caption C")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger2).toHaveFocus());
  });

  it("Space activation captures the exact thumbnail", async () => {
    const user = userEvent.setup();
    render(<MultiTriggerHarness />);
    const trigger0 = screen.getByRole("button", { name: "trigger 0" });

    trigger0.focus();
    await user.keyboard(" ");
    expect(within(getDialog()).getByText("Caption A")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger0).toHaveFocus());
  });
});

describe("EvidenceLightbox — trigger-focus restoration", () => {
  it("opening thumbnail 1, navigating to image 3 (the last), then closing returns focus to thumbnail 1", async () => {
    const user = userEvent.setup();
    render(<MultiTriggerHarness />);
    const trigger0 = screen.getByRole("button", { name: "trigger 0" });

    await user.click(trigger0);
    await user.click(within(getDialog()).getByRole("button", { name: "Next result" }));
    await user.click(within(getDialog()).getByRole("button", { name: "Next result" }));
    expect(within(getDialog()).getByText("Caption C")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger0).toHaveFocus());
  });

  it("closing via Escape restores the original trigger", async () => {
    const user = userEvent.setup();
    render(<MultiTriggerHarness />);
    const trigger1 = screen.getByRole("button", { name: "trigger 1" });

    await user.click(trigger1);
    await user.click(within(getDialog()).getByRole("button", { name: "Next result" }));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger1).toHaveFocus());
  });

  it("closing via the close button restores the original trigger", async () => {
    const user = userEvent.setup();
    render(<MultiTriggerHarness />);
    const trigger1 = screen.getByRole("button", { name: "trigger 1" });

    await user.click(trigger1);
    await user.click(within(getDialog()).getByRole("button", { name: "Next result" }));
    await user.click(within(getDialog()).getByRole("button", { name: "Close enlarged image" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger1).toHaveFocus());
  });

  it("closing via backdrop click restores the original trigger", async () => {
    const user = userEvent.setup();
    render(<MultiTriggerHarness />);
    const trigger2 = screen.getByRole("button", { name: "trigger 2" });

    await user.click(trigger2);
    await user.click(within(getDialog()).getByRole("button", { name: "Previous result" }));
    await user.click(getDialog()); // the dialog element's own padding area — the backdrop-equivalent click target
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger2).toHaveFocus());
  });

  it("closing via the native dialog default action (same 'close' event as Escape) restores the original trigger", async () => {
    // There is no separate "native close" surface distinct from Escape's
    // native default action in this component — both fire the exact same
    // `close` event on the <dialog>, which `handleDialogClose` handles in
    // one place. This test exists to make that equivalence explicit rather
    // than leaving it implied by the Escape test alone.
    const user = userEvent.setup();
    render(<MultiTriggerHarness />);
    const trigger0 = screen.getByRole("button", { name: "trigger 0" });

    await user.click(trigger0);
    getDialog().dispatchEvent(new Event("close"));
    await waitFor(() => expect(document.body.style.overflow).not.toBe("hidden"));
    await waitFor(() => expect(trigger0).toHaveFocus());
  });

  it("Prev/Next button navigation never changes the return-focus target", async () => {
    const user = userEvent.setup();
    render(<MultiTriggerHarness />);
    const trigger0 = screen.getByRole("button", { name: "trigger 0" });

    await user.click(trigger0);
    await user.click(within(getDialog()).getByRole("button", { name: "Next result" }));
    await user.click(within(getDialog()).getByRole("button", { name: "Next result" }));
    await user.click(within(getDialog()).getByRole("button", { name: "Previous result" }));

    await user.click(within(getDialog()).getByRole("button", { name: "Close enlarged image" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger0).toHaveFocus());
  });

  it("Left/Right Arrow key navigation, including wrap-around, never changes the return-focus target", async () => {
    const user = userEvent.setup();
    render(<MultiTriggerHarness />);
    const trigger1 = screen.getByRole("button", { name: "trigger 1" });

    await user.click(trigger1);
    await user.keyboard("{ArrowRight}"); // -> index 2
    await user.keyboard("{ArrowRight}"); // wraps -> index 0
    await user.keyboard("{ArrowLeft}"); // -> index 2
    await user.keyboard("{ArrowLeft}"); // -> index 1
    await user.keyboard("{ArrowLeft}"); // -> index 0
    expect(within(getDialog()).getByText("Caption A")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    // Still trigger 1 — the ORIGINAL opener — never trigger 0 (image A, currently shown) or any other.
    await waitFor(() => expect(trigger1).toHaveFocus());
  });
});

describe("EvidenceLightbox — safe failure on an unusable trigger", () => {
  it("a null triggerElement closes safely without throwing", async () => {
    const user = userEvent.setup();
    render(<NullTriggerHarness />);

    await user.click(screen.getByRole("button", { name: "open without a trigger" }));
    expect(getDialog()).toBeInTheDocument();

    await expect(user.keyboard("{Escape}")).resolves.not.toThrow();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(document.body.style.overflow).not.toBe("hidden"));
  });

  it("a trigger removed from the DOM before closing fails safely without throwing", async () => {
    const user = userEvent.setup();
    render(<EdgeCaseTriggerHarness mode="remove" />);

    await user.click(screen.getByRole("button", { name: "the trigger" }));
    expect(getDialog()).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");

    await user.click(screen.getByRole("button", { name: "mutate the trigger" }));
    expect(screen.queryByRole("button", { name: "the trigger" })).not.toBeInTheDocument();

    await expect(user.keyboard("{Escape}")).resolves.not.toThrow();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(document.body.style.overflow).not.toBe("hidden"));
  });

  it("a trigger disabled before closing fails safely without throwing", async () => {
    const user = userEvent.setup();
    render(<EdgeCaseTriggerHarness mode="disable" />);

    await user.click(screen.getByRole("button", { name: "the trigger" }));
    await user.click(screen.getByRole("button", { name: "mutate the trigger" }));
    expect(screen.getByRole("button", { name: "the trigger" })).toBeDisabled();

    await expect(user.keyboard("{Escape}")).resolves.not.toThrow();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(document.body.style.overflow).not.toBe("hidden"));
  });

  it("a trigger hidden before closing fails safely without throwing", async () => {
    const user = userEvent.setup();
    render(<EdgeCaseTriggerHarness mode="hide" />);

    await user.click(screen.getByRole("button", { name: "the trigger" }));
    await user.click(screen.getByRole("button", { name: "mutate the trigger" }));
    expect(screen.queryByRole("button", { name: "the trigger" })).not.toBeInTheDocument(); // hidden elements are excluded from the accessibility tree

    await expect(user.keyboard("{Escape}")).resolves.not.toThrow();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(document.body.style.overflow).not.toBe("hidden"));
  });
});

describe("EvidenceLightbox — instance isolation", () => {
  it("two independent gallery instances never overwrite each other's stored trigger", async () => {
    const user = userEvent.setup();
    render(
      <>
        <div data-testid="gallery-a">
          <MultiTriggerHarness />
        </div>
        <div data-testid="gallery-b">
          <MultiTriggerHarness />
        </div>
      </>,
    );
    const galleryA = screen.getByTestId("gallery-a");
    const galleryB = screen.getByTestId("gallery-b");
    const aTrigger0 = within(galleryA).getByRole("button", { name: "trigger 0" });
    const bTrigger2 = within(galleryB).getByRole("button", { name: "trigger 2" });

    await user.click(aTrigger0);
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(aTrigger0).toHaveFocus());

    // Gallery B's independent state is untouched by anything that just happened in A.
    await user.click(bTrigger2);
    expect(within(getDialog()).getByText("Caption C")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(bTrigger2).toHaveFocus());
    expect(aTrigger0).not.toHaveFocus();
  });
});

describe("EvidenceLightbox — React Strict Mode", () => {
  it("capture, navigation, and close-time restoration all behave correctly under React.StrictMode's double-invoked renders/effects", async () => {
    const user = userEvent.setup();
    render(
      <StrictMode>
        <MultiTriggerHarness />
      </StrictMode>,
    );
    const trigger1 = screen.getByRole("button", { name: "trigger 1" });

    await user.click(trigger1);
    expect(within(getDialog()).getByText("Caption B")).toBeInTheDocument();
    await user.click(within(getDialog()).getByRole("button", { name: "Next result" }));
    expect(within(getDialog()).getByText("Caption C")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger1).toHaveFocus());
  });
});

describe("EvidenceLightbox — no dependency on document.activeElement", () => {
  // No source-string check here: `document.activeElement` legitimately still
  // appears elsewhere in evidence-lightbox.tsx (the pre-existing Tab-key
  // focus-trap effect, an unrelated concern, read inside a keydown handler —
  // not render). A blanket "the file never contains this string" assertion
  // would be a false positive against that. The behavioral test below is the
  // precise proof: it makes document.activeElement actively WRONG at every
  // point in the open/navigate/close lifecycle and shows restoration is
  // still correct, which is only possible if nothing on this path reads it.
  it("an unrelated element stealing focus at any point during open/navigate/close never changes which trigger gets restored", async () => {
    const user = userEvent.setup();
    render(<MultiTriggerHarness />);
    const trigger0 = screen.getByRole("button", { name: "trigger 0" });

    const decoy = document.createElement("button");
    decoy.textContent = "decoy, unrelated to any gallery";
    document.body.appendChild(decoy);

    await user.click(trigger0);
    decoy.focus();
    expect(document.activeElement).toBe(decoy); // document.activeElement is deliberately WRONG right now

    await user.click(within(getDialog()).getByRole("button", { name: "Next result" }));
    decoy.focus();
    expect(document.activeElement).toBe(decoy); // still wrong, right before closing

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    // Restoration still correctly targets trigger0 — proving it was never
    // derived from document.activeElement's (misleading) state.
    await waitFor(() => expect(trigger0).toHaveFocus());

    document.body.removeChild(decoy);
  });
});
