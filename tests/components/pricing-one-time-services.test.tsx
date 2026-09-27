// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { OneTimeOfferSection } from "@/components/public/one-time-offer-section";
import {
  ONE_TIME_CATEGORIES,
  ONE_TIME_OFFERS,
  formatPriceCents,
  getCatalogContactHref,
  getOneTimeOffersByCategory,
} from "@/lib/pricing-catalog";

function renderAllCategories() {
  return render(
    <div>
      {ONE_TIME_CATEGORIES.map((category) => (
        <OneTimeOfferSection
          key={category.id}
          label={category.label}
          offers={getOneTimeOffersByCategory(category.id)}
        />
      ))}
    </div>,
  );
}

function offerRow(offer: (typeof ONE_TIME_OFFERS)[number]) {
  return screen.getByRole("link", { name: new RegExp(escapeRegExp(offer.name)) });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe("OneTimeOfferSection (/pricing, Need just one piece done?)", () => {
  it("renders every offer as one row link and no Request a Proposal buttons", () => {
    renderAllCategories();
    expect(screen.getAllByRole("link")).toHaveLength(ONE_TIME_OFFERS.length);
    expect(screen.queryByText("Request a Proposal")).not.toBeInTheDocument();
  });

  it("links each row to the same prefilled contact URL the button used", () => {
    renderAllCategories();
    for (const offer of ONE_TIME_OFFERS) {
      expect(offerRow(offer)).toHaveAttribute("href", getCatalogContactHref(offer));
    }
  });

  it("announces the offer name and price as each row's accessible name", () => {
    renderAllCategories();
    for (const offer of ONE_TIME_OFFERS) {
      const name = offerRow(offer).textContent ?? "";
      expect(name).toContain(offer.name);
      expect(name).toContain(formatPriceCents(offer.priceCents));
      expect(name).toContain(offer.unit);
    }
  });

  it("uses no filled button styling on any row", () => {
    renderAllCategories();
    for (const link of screen.getAllByRole("link")) {
      expect(link).not.toHaveClass("bg-action");
      expect(link).not.toHaveClass("rounded-full");
    }
  });

  it("shows a decorative arrow hidden from screen readers", () => {
    renderAllCategories();
    for (const link of screen.getAllByRole("link")) {
      const arrow = link.querySelector("svg");
      expect(arrow).not.toBeNull();
      expect(arrow).toHaveAttribute("aria-hidden", "true");
      expect(arrow).toHaveClass("text-ink-muted");
    }
  });

  it("has the warm hover tint and orange hover states on name and arrow", () => {
    renderAllCategories();
    const offer = ONE_TIME_OFFERS[0]!;
    const row = offerRow(offer);
    expect(row).toHaveClass("group", "hover:bg-accent/40");
    expect(screen.getByText(offer.name)).toHaveClass("group-hover:text-action");
    expect(row.querySelector("svg")).toHaveClass("group-hover:text-action", "group-hover:translate-x-1");
  });

  it("is reachable by keyboard, one tab stop per row, with a visible focus ring", async () => {
    const user = userEvent.setup();
    renderAllCategories();
    const renderedOrder = ONE_TIME_CATEGORIES.flatMap((category) =>
      getOneTimeOffersByCategory(category.id),
    );
    for (const offer of renderedOrder) {
      await user.tab();
      const row = offerRow(offer);
      expect(row).toHaveFocus();
      expect(row).toHaveClass("focus-visible:outline-2", "focus-visible:outline-action");
    }
  });
});
