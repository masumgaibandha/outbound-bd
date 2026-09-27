// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// SiteHeader calls usePathname() — outside a real Next.js App Router tree
// that returns null, which SiteHeader's isNavLinkActive() then
// dereferences. Same stub tests/components/public-layout-banner.test.tsx
// already uses for the same reason.
vi.mock("next/navigation", () => ({
  usePathname: () => "/this-page-does-not-exist",
}));

// Logo renders static PNG imports through next/image; Vite's default asset
// transform returns a bare URL string rather than the {src,width,height}
// object next/image requires. Irrelevant to what these tests check.
vi.mock("@/components/public/logo", () => ({
  Logo: () => null,
}));

// Same SHOW_MASTERCLASS_BANNER override as public-layout-banner.test.tsx.
// `undefined` means "use the real committed value".
const bannerOverride = vi.hoisted(() => ({ value: undefined as boolean | undefined }));
vi.mock("@/components/public/site-config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/public/site-config")>();
  return {
    ...actual,
    get SHOW_MASTERCLASS_BANNER() {
      return bannerOverride.value ?? actual.SHOW_MASTERCLASS_BANNER;
    },
  };
});

import NotFound from "@/app/not-found";
import { masterclassSlug } from "@/lib/masterclass/constants";

beforeEach(() => {
  vi.unstubAllEnvs();
  bannerOverride.value = undefined;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("NotFound (root 404 page)", () => {
  it("renders the approved label", () => {
    render(<NotFound />);
    expect(screen.getByText("404 · Page not found")).toBeInTheDocument();
  });

  it("renders the approved Bangla heading as the page's only h1", () => {
    render(<NotFound />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("পৃষ্ঠা খুঁজে পাওয়া যায়নি");
  });

  it("renders the approved description", () => {
    render(<NotFound />);
    expect(
      screen.getByText(
        "আপনি যে পৃষ্ঠাটি খুঁজছেন সেটি হয়তো সরানো হয়েছে, পরিবর্তন করা হয়েছে, অথবা ঠিকানাটি সঠিক নয়।",
      ),
    ).toBeInTheDocument();
  });

  it("has exactly one semantic main region", () => {
    render(<NotFound />);
    expect(screen.getAllByRole("main")).toHaveLength(1);
  });

  it("the homepage action points to /", () => {
    render(<NotFound />);
    const link = screen.getByRole("link", { name: "হোমপেজে ফিরুন" });
    expect(link).toHaveAttribute("href", "/");
  });

  it("the masterclass action points to the centralized masterclass route", () => {
    render(<NotFound />);
    const link = screen.getByRole("link", { name: "মাস্টারক্লাস দেখুন" });
    expect(link).toHaveAttribute("href", `/masterclass/${masterclassSlug}`);
    expect(masterclassSlug).toBe("lead-generation-cold-email");
  });

  it("renders no form of any kind", () => {
    const { container } = render(<NotFound />);
    expect(container.querySelector("form")).toBeNull();
  });

  it("renders the site header and footer exactly once each, never duplicated", () => {
    render(<NotFound />);
    expect(screen.getAllByRole("link", { name: "Outbound BD, home" })).toHaveLength(1);
    expect(screen.getAllByRole("contentinfo")).toHaveLength(1);
  });

  it("never shows the masterclass announcement banner while registration is closed", () => {
    // vi.unstubAllEnvs() in beforeEach leaves MASTERCLASS_REGISTRATION_ENABLED unset.
    render(<NotFound />);
    expect(screen.queryByRole("region", { name: "Masterclass announcement" })).not.toBeInTheDocument();
  });

  it("never shows the banner while SHOW_MASTERCLASS_BANNER is off, even with registration open", () => {
    vi.stubEnv("MASTERCLASS_REGISTRATION_ENABLED", "true");
    render(<NotFound />);
    expect(screen.queryByRole("region", { name: "Masterclass announcement" })).not.toBeInTheDocument();
  });

  it("shows the banner again once SHOW_MASTERCLASS_BANNER is on and registration is open", () => {
    // Only the homepage hides it; a 404 is never "/".
    bannerOverride.value = true;
    vi.stubEnv("MASTERCLASS_REGISTRATION_ENABLED", "true");
    render(<NotFound />);
    expect(screen.getByRole("region", { name: "Masterclass announcement" })).toBeInTheDocument();
  });
});
