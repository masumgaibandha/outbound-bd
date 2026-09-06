// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// SiteHeader calls usePathname() — outside a real Next.js App Router tree
// that returns null, which SiteHeader's isNavLinkActive() then
// dereferences. Same stub other component tests in this repo already use.
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

// Forward className/props through to a plain <img> instead of the real
// Logo (which needs Next's own image loader for its static PNG imports) —
// lets these tests assert on the exact responsive height classes SiteHeader
// applies without touching next/image internals.
vi.mock("@/components/public/logo", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- test-only stand-in for next/image, never shipped.
  Logo: ({ className }: { className?: string }) => <img alt="Outbound BD" className={className} />,
}));

import { SiteHeader } from "@/components/public/site-header";

describe("SiteHeader — navigation logo responsive sizing", () => {
  it("renders the logo at the enlarged, responsive heights with aspect ratio preserved (w-auto)", () => {
    render(<SiteHeader />);
    const logo = screen.getByRole("link", { name: "Outbound BD — home" }).querySelector("img");
    expect(logo).not.toBeNull();
    const classes = logo!.className.split(/\s+/);

    // Width stays "auto" at every breakpoint so only height classes control
    // sizing — this is what keeps the source PNG's aspect ratio intact.
    expect(classes).toContain("w-auto");

    // Enlarged from the previous 27/30/33px sizing (h-[27px] w-auto
    // sm:h-[30px] lg:h-[33px]) to Tailwind's h-8/h-9/h-10 scale (32/36/40px)
    // — a deliberate, visible increase, verified in Playwright QA to still
    // fit inside the h-18 (72px) / h-20 (80px) header with no overflow.
    expect(classes).toContain("h-8");
    expect(classes).toContain("sm:h-9");
    expect(classes).toContain("lg:h-10");

    // Never regress back to the previous, smaller arbitrary-pixel sizing.
    expect(classes).not.toContain("h-[27px]");
    expect(classes).not.toContain("sm:h-[30px]");
    expect(classes).not.toContain("lg:h-[33px]");
  });

  it("still renders exactly one home-linked logo", () => {
    render(<SiteHeader />);
    expect(screen.getAllByRole("link", { name: "Outbound BD — home" })).toHaveLength(1);
  });
});
