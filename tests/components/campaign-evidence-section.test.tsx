// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { CampaignEvidenceItem } from "@/components/public/campaign-evidence-data";
import { CampaignEvidenceSection } from "@/components/public/campaign-evidence-section";

/**
 * Regression coverage for the shared trigger-focus fix, exercised through
 * the agency's real English wrapper (as opposed to
 * `tests/components/masterclass-evidence-gallery.test.tsx`'s Bengali one,
 * and `tests/components/evidence-lightbox.test.tsx`'s direct unit tests of
 * the shared primitive) — proves the fix holds end-to-end for both callers
 * of `EvidenceLightbox`, not just one.
 *
 * Uses a local fixture rather than the real `campaignEvidence` data: the
 * real entries' `src` is a webpack/Turbopack static import (a real
 * `StaticImageData` object in the actual app, but Vitest's own asset
 * handling resolves the same import to a bare string) — the agency
 * thumbnail's own `<Image>` has no `fill` and no explicit width/height, so
 * it needs real `StaticImageData` shape to render at all. This is a
 * pre-existing characteristic of that component (untouched by this fix,
 * out of scope here) rather than anything wrong with the fixture strategy.
 */
const MOCK_ITEMS: CampaignEvidenceItem[] = [
  {
    id: "a",
    src: { src: "/mock-a.png", width: 1200, height: 600 },
    alt: "Mock evidence A",
    platform: "Instantly",
    category: "campaign-performance",
    caption: "Mock caption A",
  },
  {
    id: "b",
    src: { src: "/mock-b.png", width: 1200, height: 600 },
    alt: "Mock evidence B",
    platform: "Instantly",
    category: "campaign-performance",
    caption: "Mock caption B",
  },
  {
    id: "c",
    src: { src: "/mock-c.png", width: 1200, height: 600 },
    alt: "Mock evidence C",
    platform: "Smartlead",
    category: "infrastructure",
    caption: "Mock caption C",
  },
];

function renderSection() {
  return render(<CampaignEvidenceSection items={MOCK_ITEMS} />);
}

function getThumbnailButtons() {
  return screen.getAllByRole("button", { name: /^Enlarge screenshot/ });
}

function getDialog() {
  return screen.getByRole("dialog");
}

describe("CampaignEvidenceSection — trigger-focus regression (agency /results gallery)", () => {
  it("opening thumbnail 1, navigating to the last image, and closing with Escape restores focus to thumbnail 1", async () => {
    const user = userEvent.setup();
    renderSection();
    const thumbnails = getThumbnailButtons();

    await user.click(thumbnails[0]);
    expect(within(getDialog()).getByText(MOCK_ITEMS[0].caption)).toBeInTheDocument();

    const nextButton = () => within(getDialog()).getByRole("button", { name: "Next result" });
    for (let i = 0; i < MOCK_ITEMS.length - 1; i++) {
      await user.click(nextButton());
    }
    expect(
      within(getDialog()).getByText(MOCK_ITEMS[MOCK_ITEMS.length - 1].caption),
    ).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(thumbnails[0]).toHaveFocus());
    expect(thumbnails[MOCK_ITEMS.length - 1]).not.toHaveFocus();
  });

  it("opening thumbnail 2, navigating away, and closing via the close button restores focus to thumbnail 2", async () => {
    const user = userEvent.setup();
    renderSection();
    const thumbnails = getThumbnailButtons();

    await user.click(thumbnails[1]);
    await user.click(within(getDialog()).getByRole("button", { name: "Next result" }));
    await user.click(within(getDialog()).getByRole("button", { name: "Next result" }));

    await user.click(within(getDialog()).getByRole("button", { name: "Close enlarged image" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(thumbnails[1]).toHaveFocus());
  });

  it("opening a thumbnail, navigating away, and closing via backdrop click restores focus to the original thumbnail", async () => {
    const user = userEvent.setup();
    renderSection();
    const thumbnails = getThumbnailButtons();

    await user.click(thumbnails[2]);
    await user.click(within(getDialog()).getByRole("button", { name: "Previous result" }));

    const dialog = getDialog();
    await user.click(dialog); // clicking the dialog element itself (not its inner content) is the backdrop
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(thumbnails[2]).toHaveFocus());
  });
});
