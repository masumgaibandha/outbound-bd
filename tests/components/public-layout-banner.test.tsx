// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// SiteHeader (rendered by PublicLayout) calls usePathname() — outside a real
// Next.js App Router tree that returns null, which SiteHeader's
// isNavLinkActive() then dereferences. Stubbing it is the standard way to
// unit-test a component that only needs "some current pathname", not real
// router behavior.
// Mutable so one test can render the homepage, where the banner is hidden;
// every other test renders a non-home agency page.
let mockPathname = "/services";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

// Logo renders 6 static PNG imports through next/image. Vite's default
// asset transform (unlike Next's own webpack/Turbopack loader) returns a
// bare URL string rather than a {src,width,height} object, which
// next/image requires for a non-fill, non-explicit-dimensions <Image> —
// irrelevant to what these tests check, so stub the whole component.
vi.mock("@/components/public/logo", () => ({
  Logo: () => null,
}));

// SHOW_MASTERCLASS_BANNER is a plain constant, so tests that need to check
// the "banner switched back on" path override it here. `undefined` means
// "use the real committed value".
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

import PublicLayout from "@/app/(public)/layout";

function renderLayout() {
  return render(
    <PublicLayout>
      <p>page content</p>
    </PublicLayout>,
  );
}

function queryBanner() {
  return screen.queryByRole("region", { name: "Masterclass announcement" });
}

beforeEach(() => {
  vi.unstubAllEnvs();
  mockPathname = "/services";
  bannerOverride.value = undefined;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("PublicLayout — masterclass banner hidden by SHOW_MASTERCLASS_BANNER", () => {
  it("renders no banner on any public page, even with MASTERCLASS_REGISTRATION_ENABLED on", () => {
    vi.stubEnv("MASTERCLASS_REGISTRATION_ENABLED", "true");
    for (const pathname of [
      "/",
      "/services",
      "/pricing",
      "/contact",
      "/about",
      "/about/founder",
      "/how-it-works",
      "/results",
      "/testimonials",
      "/faq",
      "/privacy-policy",
      "/terms-of-service",
    ]) {
      mockPathname = pathname;
      const { unmount } = renderLayout();
      expect(queryBanner()).not.toBeInTheDocument();
      expect(screen.getByText("page content")).toBeInTheDocument();
      unmount();
    }
  });

  it("renders no banner with MASTERCLASS_REGISTRATION_ENABLED off", () => {
    vi.stubEnv("MASTERCLASS_REGISTRATION_ENABLED", "false");
    renderLayout();
    expect(queryBanner()).not.toBeInTheDocument();
  });

  it("still renders the agency header and footer", () => {
    renderLayout();
    expect(screen.getByRole("link", { name: "Outbound BD, home" })).toBeInTheDocument();
    expect(screen.getByText("page content")).toBeInTheDocument();
  });
});

describe("PublicLayout — banner gating once SHOW_MASTERCLASS_BANNER is switched back on", () => {
  beforeEach(() => {
    bannerOverride.value = true;
  });

  it('renders the banner when MASTERCLASS_REGISTRATION_ENABLED is exactly "true"', () => {
    vi.stubEnv("MASTERCLASS_REGISTRATION_ENABLED", "true");
    renderLayout();
    expect(screen.getByRole("region", { name: "Masterclass announcement" })).toBeInTheDocument();
  });

  it('renders no banner markup when MASTERCLASS_REGISTRATION_ENABLED is "false"', () => {
    vi.stubEnv("MASTERCLASS_REGISTRATION_ENABLED", "false");
    renderLayout();
    expect(queryBanner()).not.toBeInTheDocument();
  });

  it("renders no banner markup when the flag is entirely missing", () => {
    // vi.unstubAllEnvs() in beforeEach already leaves it unset.
    renderLayout();
    expect(queryBanner()).not.toBeInTheDocument();
  });

  it("hides the banner on the homepage only, even with the flag on", () => {
    vi.stubEnv("MASTERCLASS_REGISTRATION_ENABLED", "true");
    mockPathname = "/";
    renderLayout();
    expect(queryBanner()).not.toBeInTheDocument();
    expect(screen.getByText("page content")).toBeInTheDocument();
  });

  it("renders the banner on other agency pages", () => {
    vi.stubEnv("MASTERCLASS_REGISTRATION_ENABLED", "true");
    for (const pathname of ["/services", "/pricing", "/contact", "/about"]) {
      mockPathname = pathname;
      const { unmount } = renderLayout();
      expect(screen.getByRole("region", { name: "Masterclass announcement" })).toBeInTheDocument();
      unmount();
    }
  });

  it("renders no banner markup for any invalid/truthy-looking-but-wrong value", () => {
    for (const invalid of ["TRUE", "1", "yes", " true", "true "]) {
      vi.stubEnv("MASTERCLASS_REGISTRATION_ENABLED", invalid);
      const { unmount } = renderLayout();
      expect(queryBanner()).not.toBeInTheDocument();
      unmount();
    }
  });

  it("never renders the raw env value or any secret-looking string into the page when the banner is shown", () => {
    vi.stubEnv("MASTERCLASS_REGISTRATION_ENABLED", "true");
    vi.stubEnv("MONGODB_URI", "mongodb://should-never-leak/db");
    vi.stubEnv("RESEND_API_KEY", "re_should_never_leak");
    const { container } = renderLayout();

    expect(container.innerHTML).not.toContain("should-never-leak");
    expect(container.innerHTML).not.toContain("MASTERCLASS_REGISTRATION_ENABLED");
  });
});
