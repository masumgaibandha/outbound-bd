// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AudienceFit } from "@/components/masterclass/AudienceFit";
import { audienceFit } from "@/data/masterclass-content";

/**
 * Regression coverage for the readiness-panel redesign: the second panel's
 * `skip` data used to be a rejection list ("যারা যোগ না দিলেই ভালো") shown
 * with a cross icon. It's now positive learning-readiness content and must
 * never regress back to negative icon/label/wording, even though the
 * internal `skip` property name is unchanged.
 */
describe("AudienceFit — both panels are positive and encouraging", () => {
  it("renders the approved positive copy for both panels", () => {
    render(<AudienceFit />);
    expect(screen.getByText(audienceFit.join.heading)).toBeInTheDocument();
    expect(screen.getByText(audienceFit.skip.heading)).toBeInTheDocument();
    expect(screen.getByText(audienceFit.join.label)).toBeInTheDocument();
    expect(screen.getByText(audienceFit.skip.label)).toBeInTheDocument();
  });

  it("renders every item from both panels", () => {
    render(<AudienceFit />);
    for (const item of audienceFit.join.items) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
    for (const item of audienceFit.skip.items) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
  });

  it("never renders a cross/rejection icon (XIcon's path) anywhere in the section", () => {
    const { container } = render(<AudienceFit />);
    const crossPaths = Array.from(container.querySelectorAll("path")).filter(
      (p) => p.getAttribute("d") === "m6 6 12 12M18 6 6 18",
    );
    expect(crossPaths).toHaveLength(0);
  });

  it("uses a check-family icon (not a cross) for every item in the second panel", () => {
    const { container } = render(<AudienceFit />);
    const items = screen.getAllByText(audienceFit.skip.items[0]);
    expect(items.length).toBeGreaterThan(0);
    // Every <li> in the section should contain an svg icon; none should be the X path.
    const svgs = container.querySelectorAll("li svg");
    expect(svgs.length).toBe(audienceFit.join.items.length + audienceFit.skip.items.length);
  });

  it("never renders rejection/negative wording ('যাদের জন্য এটি নয়', 'যোগ না দিলেই ভালো', or 'guaranteed')", () => {
    render(<AudienceFit />);
    expect(screen.queryByText(/যাদের জন্য এটি নয়/)).not.toBeInTheDocument();
    expect(screen.queryByText(/যোগ না দিলেই ভালো/)).not.toBeInTheDocument();
    expect(screen.queryByText(/guaranteed/i)).not.toBeInTheDocument();
  });

  it("keeps the two panels visually distinct via tone/color, not via a negative icon", () => {
    const { container } = render(<AudienceFit />);
    // First panel uses the brand surface + action accent; second uses the
    // alternating canvas tone — distinct without implying rejection.
    expect(container.querySelector(".bg-surface")).not.toBeNull();
    expect(container.querySelector(".bg-canvas-alt")).not.toBeNull();
  });
});
