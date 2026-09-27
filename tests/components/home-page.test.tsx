// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

// Static image imports resolve to bare strings under Vitest, which
// next/image rejects; same stand-in as the landing page tests.
vi.mock("next/image", () => ({
  default: ({ src, alt }: ComponentProps<"img"> & { src: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : ""} alt={alt ?? ""} />
  ),
}));

import HomePage from "@/app/(public)/page";
import { COLD_EMAIL_PROOF_ITEMS } from "@/components/cold-email/cold-email-copy";
import { HOME_WHY_FAILS } from "@/components/public/home-copy";
import { STRATEGY_CALL_HREF, STRATEGY_CALL_LABEL } from "@/components/public/site-config";
import { testimonials } from "@/components/public/testimonials-data";
import { getStartingMonthlyPriceLabel } from "@/lib/pricing-catalog";

function section(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing section #${id}`);
  return el;
}

describe("homepage", () => {
  it("renders exactly the approved sections, in order", () => {
    const { container } = render(<HomePage />);
    const sections = Array.from(container.querySelectorAll(":scope > section"));

    expect(sections).toHaveLength(8);
    expect(within(sections[0] as HTMLElement).getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(sections.slice(1, 7).map((s) => s.id)).toEqual([
      "services",
      "why-cold-email-fails",
      "results",
      "process",
      "testimonials",
      "pricing",
    ]);
    expect(within(sections[7] as HTMLElement).getByRole("link", { name: STRATEGY_CALL_LABEL })).toBeInTheDocument();
  });

  it("does not render the masterclass announcement banner", () => {
    render(<HomePage />);
    expect(screen.queryByRole("region", { name: "Masterclass announcement" })).not.toBeInTheDocument();
  });

  it("hero keeps the booking call primary and links the secondary button to /cold-email", () => {
    render(<HomePage />);
    const hero = document.querySelector("section") as HTMLElement;
    const scope = within(hero);
    expect(scope.getByRole("link", { name: STRATEGY_CALL_LABEL })).toHaveAttribute("href", STRATEGY_CALL_HREF);
    expect(scope.getByRole("link", { name: "See how it works" })).toHaveAttribute("href", "/cold-email");
    expect(scope.queryByRole("link", { name: "Request a Proposal" })).not.toBeInTheDocument();
  });

  it("service cards keep title, description and Learn more, without the checklists", () => {
    render(<HomePage />);
    const cards = within(section("services")).getAllByRole("link", { name: /Learn more/ });
    expect(cards).toHaveLength(4);
    for (const card of cards) {
      expect(card.querySelector("ul")).toBeNull();
    }
  });

  it("the why cold email fails section covers all six points", () => {
    render(<HomePage />);
    const scope = within(section("why-cold-email-fails"));
    expect(scope.getByRole("heading", { level: 2, name: HOME_WHY_FAILS.heading })).toBeInTheDocument();
    expect(scope.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(
      HOME_WHY_FAILS.items.map((item) => item.title),
    );
  });

  it("renders four proof items, including the 127K and Smartlead results with their caveats", () => {
    render(<HomePage />);
    const results = section("results");
    const cards = results.querySelectorAll("article");
    expect(cards).toHaveLength(4);

    const byId = new Map(COLD_EMAIL_PROOF_ITEMS.map((item) => [item.id, item]));
    const scope = within(results);
    expect(scope.getByText(byId.get("instantly-campaign-result-2")!.caption)).toBeInTheDocument();
    expect(scope.getByText(byId.get("campaign-result-smartlead")!.caption)).toBeInTheDocument();
    expect(scope.getByText(/An exceptional individual result, not a typical or guaranteed outcome/)).toBeInTheDocument();
    // Both redacted Instantly screenshots keep their redaction note.
    expect(scope.getAllByText(/Platform-assigned monetary value hidden/)).toHaveLength(2);
    // The original two keep their "platform-reported" open-rate wording.
    expect(scope.getByText(/a platform-reported 83\.9% open rate/)).toBeInTheDocument();
  });

  it("testimonials render their full text, with nothing clamping or hiding it", () => {
    render(<HomePage />);
    const scope = section("testimonials");
    const figures = scope.querySelectorAll("figure");
    expect(figures.length).toBeGreaterThan(0);

    for (const testimonial of testimonials.slice(0, figures.length)) {
      expect(within(scope).getByText(`“${testimonial.quote}”`)).toBeInTheDocument();
    }
    for (const figure of figures) {
      expect(figure.outerHTML).not.toMatch(/line-clamp|overflow-hidden|max-h-|truncate/);
      // Root cause of the old clipping: an auto top margin on the caption
      // collapsed to 0 in a row's taller card. The quote absorbs the spare
      // height now, so the caption always keeps its gap.
      const caption = figure.querySelector("figcaption")!;
      expect(caption.className).toContain("mt-6");
      expect(caption.className).not.toMatch(/mt-auto/);
    }
  });

  it("pricing is a concise overview whose starting price is read from the catalog", () => {
    render(<HomePage />);
    const pricing = section("pricing");
    const scope = within(pricing);
    expect(scope.getByTestId("home-pricing-starting")).toHaveTextContent(
      `Managed programs from ${getStartingMonthlyPriceLabel()} a month`,
    );
    expect(scope.getByText(/not included/)).toBeInTheDocument();
    expect(scope.getByRole("link", { name: "See full pricing" })).toHaveAttribute("href", "/pricing");
    // The detailed plan cards stay on /pricing only.
    expect(scope.queryByText("Most popular")).not.toBeInTheDocument();
    expect(scope.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
  });
});
