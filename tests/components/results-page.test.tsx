// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

// Static image imports resolve to bare strings under Vitest, which
// next/image rejects; same stand-in as the home page tests.
vi.mock("next/image", () => ({
  default: ({ src, alt }: ComponentProps<"img"> & { src: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : ""} alt={alt ?? ""} />
  ),
}));

import ResultsPage from "@/app/(public)/results/page";
import { campaignEvidence } from "@/components/public/campaign-evidence-data";

describe("/results page", () => {
  it("centers the hero and every section heading below it", () => {
    render(<ResultsPage />);

    const hero = screen.getByRole("heading", { level: 1, name: "Real evidence, published honestly" });
    expect(hero.parentElement).toHaveClass("text-center");

    for (const title of [
      "Selected results from Abdullah Al Masum's independent client work",
      "Verified client feedback from Abdullah Al Masum",
    ]) {
      const heading = screen.getByRole("heading", { level: 2, name: title });
      expect(heading.parentElement).toHaveClass("text-center");
      expect(heading.parentElement).not.toHaveClass("text-left");
    }
  });

  it("no longer renders the placeholder case studies section", () => {
    const { container } = render(<ResultsPage />);

    expect(screen.queryByText("Added as engagements complete")).not.toBeInTheDocument();
    expect(screen.queryByText("Case studies")).not.toBeInTheDocument();
    expect(screen.queryByText("Placeholder")).not.toBeInTheDocument();
    expect(screen.queryByText("N/A")).not.toBeInTheDocument();
    expect(container.querySelector("#case-studies")).toBeNull();
  });

  it("does not promise future case studies in the hero copy", () => {
    render(<ResultsPage />);
    expect(screen.queryByText(/future case study/i)).not.toBeInTheDocument();
  });

  it("still renders every real campaign evidence item", () => {
    render(<ResultsPage />);
    for (const item of campaignEvidence) {
      expect(screen.getByText(item.caption)).toBeInTheDocument();
    }
  });
});
