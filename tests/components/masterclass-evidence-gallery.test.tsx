// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { MasterclassEvidenceGallery } from "@/components/masterclass/MasterclassEvidenceGallery";
import { resultsProof } from "@/data/masterclass-content";
import { toBengaliDigits } from "@/lib/masterclass/format";

const ENLARGE_HINT = resultsProof.enlargeHintLabel;
const ASSETS = resultsProof.assets;

function position(current: number, total: number) {
  return `${toBengaliDigits(String(current))} / ${toBengaliDigits(String(total))}`;
}

function renderGallery() {
  return render(<MasterclassEvidenceGallery assets={ASSETS} enlargeHintLabel={ENLARGE_HINT} />);
}

function getThumbnailButtons() {
  return screen.getAllByRole("button", { name: new RegExp(`^${ENLARGE_HINT}`) });
}

function getDialog() {
  return screen.getByRole("dialog");
}

beforeEach(() => {
  document.body.style.overflow = "";
});

afterEach(() => {
  document.body.style.overflow = "";
});

describe("MasterclassEvidenceGallery — grid", () => {
  it("renders exactly the 5 audited evidence items, never the Upwork/client-feedback asset", () => {
    renderGallery();
    expect(getThumbnailButtons()).toHaveLength(5);
    expect(screen.queryByText(resultsProof.clientFeedback.caption)).not.toBeInTheDocument();
    expect(screen.queryByText(resultsProof.viewFullSizeLabel, { exact: false })).not.toBeInTheDocument();
  });

  it("every caption, alt text, and caveat/note from the data file is rendered verbatim", () => {
    const { container } = renderGallery();
    const cards = container.querySelectorAll("ul.grid > li");
    expect(cards).toHaveLength(ASSETS.length);
    ASSETS.forEach((asset, index) => {
      const card = within(cards[index] as HTMLElement);
      expect(card.getByText(asset.caption)).toBeInTheDocument();
      if (asset.note) {
        expect(card.getByText(asset.note)).toBeInTheDocument();
      }
    });
  });

  it("the 5th (odd) card spans both grid columns", () => {
    const { container } = renderGallery();
    const items = container.querySelectorAll("ul.grid > li");
    expect(items).toHaveLength(5);
    expect(items[4]).toHaveClass("md:col-span-2");
    for (let i = 0; i < 4; i++) {
      expect(items[i]).not.toHaveClass("md:col-span-2");
    }
  });

  it("the grid uses one column below md and two columns from md up (grid + md:grid-cols-2 classes)", () => {
    const { container } = renderGallery();
    const grid = container.querySelector("ul");
    expect(grid).toHaveClass("grid");
    expect(grid).toHaveClass("md:grid-cols-2");
    expect(grid?.className).not.toMatch(/(?<!md:)grid-cols-2/); // no unconditional 2-col class
  });
});

describe("MasterclassEvidenceGallery — lightbox open/close", () => {
  it("opens on click and shows the selected image's alt/caption, with an accurate position indicator", async () => {
    const user = userEvent.setup();
    renderGallery();
    const thumbnails = getThumbnailButtons();

    await user.click(thumbnails[0]);

    const dialog = getDialog();
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(ASSETS[0].caption)).toBeInTheDocument();
    expect(within(dialog).getByText(position(1, ASSETS.length))).toBeInTheDocument();
  });

  it("opens by keyboard (Enter and Space activate the trigger button natively)", async () => {
    const user = userEvent.setup();
    renderGallery();
    const thumbnails = getThumbnailButtons();

    thumbnails[1].focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(within(getDialog()).getByText(ASSETS[1].caption)).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    // The component restores focus to the triggering thumbnail itself via a
    // requestAnimationFrame — wait for that to actually land before moving
    // focus elsewhere, or it can race and steal focus back.
    await waitFor(() => expect(thumbnails[1]).toHaveFocus());

    thumbnails[2].focus();
    await user.keyboard(" ");
    expect(within(getDialog()).getByText(ASSETS[2].caption)).toBeInTheDocument();
  });

  it("closes on Escape and restores focus to the exact triggering thumbnail", async () => {
    const user = userEvent.setup();
    renderGallery();
    const thumbnails = getThumbnailButtons();

    await user.click(thumbnails[3]);
    expect(getDialog()).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    // Focus restoration runs in a requestAnimationFrame — wait for it.
    await waitFor(() => expect(thumbnails[3]).toHaveFocus());
  });

  it("regression: opening thumbnail 1 and navigating all the way to the last image before closing still restores focus to thumbnail 1 — not whichever thumbnail matches the last-viewed image", async () => {
    const user = userEvent.setup();
    renderGallery();
    const thumbnails = getThumbnailButtons();

    await user.click(thumbnails[0]);
    expect(within(getDialog()).getByText(ASSETS[0].caption)).toBeInTheDocument();

    // Navigate all the way to the last (5th) item.
    const nextButton = () => within(getDialog()).getByRole("button", { name: "পরের ছবি" });
    for (let i = 0; i < ASSETS.length - 1; i++) {
      await user.click(nextButton());
    }
    expect(within(getDialog()).getByText(ASSETS[ASSETS.length - 1].caption)).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    // Must be thumbnail 1 (the ORIGINAL opener), never thumbnail 5 (the last-viewed image).
    await waitFor(() => expect(thumbnails[0]).toHaveFocus());
    expect(thumbnails[ASSETS.length - 1]).not.toHaveFocus();
  });

  it("closes via the close button", async () => {
    const user = userEvent.setup();
    renderGallery();
    await user.click(getThumbnailButtons()[0]);

    const closeButton = within(getDialog()).getByRole("button", { name: "বন্ধ করুন" });
    await user.click(closeButton);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("locks body scroll while open and restores it after close", async () => {
    const user = userEvent.setup();
    renderGallery();
    expect(document.body.style.overflow).not.toBe("hidden");

    await user.click(getThumbnailButtons()[0]);
    expect(document.body.style.overflow).toBe("hidden");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("clicking inside the dialog content does not close it", async () => {
    const user = userEvent.setup();
    renderGallery();
    await user.click(getThumbnailButtons()[0]);

    const dialog = getDialog();
    await user.click(within(dialog).getByText(ASSETS[0].caption));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("clicking the backdrop (the dialog element itself, outside its content) closes it", async () => {
    const user = userEvent.setup();
    renderGallery();
    await user.click(getThumbnailButtons()[0]);

    const dialog = getDialog();
    // The dialog element's own padding area (outside the inner content div) is the backdrop-equivalent click target in this implementation.
    await user.click(dialog);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe("MasterclassEvidenceGallery — navigation", () => {
  it("Next button and Right Arrow advance, with wrap-around from last to first", async () => {
    const user = userEvent.setup();
    renderGallery();
    await user.click(getThumbnailButtons()[0]);

    const nextButton = () => within(getDialog()).getByRole("button", { name: "পরের ছবি" });
    for (let i = 1; i < ASSETS.length; i++) {
      await user.click(nextButton());
      expect(within(getDialog()).getByText(ASSETS[i].caption)).toBeInTheDocument();
      expect(within(getDialog()).getByText(position(i + 1, ASSETS.length))).toBeInTheDocument();
    }
    // One more click from the last item wraps back to the first.
    await user.click(nextButton());
    expect(within(getDialog()).getByText(ASSETS[0].caption)).toBeInTheDocument();
    expect(within(getDialog()).getByText(position(1, ASSETS.length))).toBeInTheDocument();
  });

  it("Left/Right Arrow keys navigate, with wrap-around from first to last", async () => {
    const user = userEvent.setup();
    renderGallery();
    await user.click(getThumbnailButtons()[0]);

    // From item 0, ArrowLeft should wrap to the last item.
    await user.keyboard("{ArrowLeft}");
    expect(within(getDialog()).getByText(ASSETS[ASSETS.length - 1].caption)).toBeInTheDocument();

    // ArrowRight from the last item wraps back to the first.
    await user.keyboard("{ArrowRight}");
    expect(within(getDialog()).getByText(ASSETS[0].caption)).toBeInTheDocument();

    await user.keyboard("{ArrowRight}");
    expect(within(getDialog()).getByText(ASSETS[1].caption)).toBeInTheDocument();
  });
});

describe("MasterclassEvidenceGallery — accessibility labeling", () => {
  it("labels the dialog via aria-labelledby pointing at the active item's alt text", async () => {
    const user = userEvent.setup();
    renderGallery();
    await user.click(getThumbnailButtons()[0]);

    const dialog = getDialog();
    const labelledBy = dialog.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    const titleEl = document.getElementById(labelledBy as string);
    expect(titleEl?.textContent).toBe(ASSETS[0].alt);
  });

  it("every image inside the rendered lightbox <img> reflects the active item's alt text", async () => {
    const user = userEvent.setup();
    renderGallery();
    await user.click(getThumbnailButtons()[0]);

    const enlargedImage = within(getDialog()).getByRole("img");
    expect(enlargedImage).toHaveAttribute("alt", ASSETS[0].alt);
  });
});
