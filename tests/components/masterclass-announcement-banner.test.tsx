// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { MasterclassAnnouncementBanner } from "@/components/public/masterclass-announcement-banner";
import { classDates } from "@/lib/masterclass/constants";
import { formatClassDatesEn } from "@/lib/masterclass/format";

const APPROVED_DATE_LABEL = formatClassDatesEn(classDates.day1, classDates.day2);
const APPROVED_MESSAGE = `2-Day Live Masterclass: Lead Generation & Cold Email Outreach — ${APPROVED_DATE_LABEL}`;

describe("MasterclassAnnouncementBanner", () => {
  it("renders the approved message and CTA, derived from the current classDates source of truth", () => {
    render(<MasterclassAnnouncementBanner />);

    const region = screen.getByRole("region", { name: "Masterclass announcement" });
    expect(within(region).getByText(APPROVED_MESSAGE, { exact: false })).toBeInTheDocument();
    // The exact October 23-24, 2026 dates, not a stale Oct 2-3 wording.
    expect(APPROVED_DATE_LABEL).toBe("Oct 23–24, 2026");
    expect(region.textContent).not.toMatch(/Oct(ober)?\s*2[–-]3\b/);
  });

  it("the CTA resolves to /masterclass/lead-generation-cold-email and opens no new tab", () => {
    render(<MasterclassAnnouncementBanner />);

    const cta = screen.getByRole("link", { name: "View Masterclass" });
    expect(cta).toHaveAttribute("href", "/masterclass/lead-generation-cold-email");
    expect(cta).not.toHaveAttribute("target");
  });

  it("never shows the early-bird price", () => {
    render(<MasterclassAnnouncementBanner />);
    const region = screen.getByRole("region", { name: "Masterclass announcement" });
    expect(region.textContent).not.toMatch(/৳|BDT|1,?499|1,?999/);
  });

  it("the dismiss button has an accessible name and removes the banner on click", async () => {
    const user = userEvent.setup();
    render(<MasterclassAnnouncementBanner />);

    expect(screen.getByRole("region", { name: "Masterclass announcement" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Dismiss masterclass announcement" }));
    expect(screen.queryByRole("region", { name: "Masterclass announcement" })).not.toBeInTheDocument();
  });

  it("the dismiss button is keyboard-operable (Enter)", async () => {
    const user = userEvent.setup();
    render(<MasterclassAnnouncementBanner />);

    screen.getByRole("button", { name: "Dismiss masterclass announcement" }).focus();
    await user.keyboard("{Enter}");
    await waitFor(() =>
      expect(screen.queryByRole("region", { name: "Masterclass announcement" })).not.toBeInTheDocument(),
    );
  });

  it("the dismiss button carries a focus-visible outline treatment", () => {
    render(<MasterclassAnnouncementBanner />);
    const dismissButton = screen.getByRole("button", { name: "Dismiss masterclass announcement" });
    expect(dismissButton.className).toMatch(/focus-visible:outline/);
  });
});
