// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// SiteHeader (rendered by PublicLayout) calls usePathname() — outside a real
// Next.js App Router tree that returns null, which SiteHeader's
// isNavLinkActive() then dereferences. Stubbing it is the standard way to
// unit-test a component that only needs "some current pathname", not real
// router behavior.
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

// Logo renders 6 static PNG imports through next/image. Vite's default
// asset transform (unlike Next's own webpack/Turbopack loader) returns a
// bare URL string rather than a {src,width,height} object, which
// next/image requires for a non-fill, non-explicit-dimensions <Image> —
// irrelevant to what these tests check, so stub the whole component.
vi.mock("@/components/public/logo", () => ({
  Logo: () => null,
}));

import PublicLayout from "@/app/(public)/layout";

function renderLayout() {
  return render(
    <PublicLayout>
      <p>page content</p>
    </PublicLayout>,
  );
}

beforeEach(() => {
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("PublicLayout — masterclass announcement banner gating", () => {
  it('renders the banner when MASTERCLASS_REGISTRATION_ENABLED is exactly "true"', () => {
    vi.stubEnv("MASTERCLASS_REGISTRATION_ENABLED", "true");
    renderLayout();
    expect(screen.getByRole("region", { name: "Masterclass announcement" })).toBeInTheDocument();
  });

  it('renders no banner markup when MASTERCLASS_REGISTRATION_ENABLED is "false"', () => {
    vi.stubEnv("MASTERCLASS_REGISTRATION_ENABLED", "false");
    renderLayout();
    expect(screen.queryByRole("region", { name: "Masterclass announcement" })).not.toBeInTheDocument();
  });

  it("renders no banner markup when the flag is entirely missing", () => {
    // vi.unstubAllEnvs() in beforeEach already leaves it unset.
    renderLayout();
    expect(screen.queryByRole("region", { name: "Masterclass announcement" })).not.toBeInTheDocument();
  });

  it("renders no banner markup for any invalid/truthy-looking-but-wrong value", () => {
    for (const invalid of ["TRUE", "1", "yes", " true", "true "]) {
      vi.stubEnv("MASTERCLASS_REGISTRATION_ENABLED", invalid);
      const { unmount } = renderLayout();
      expect(screen.queryByRole("region", { name: "Masterclass announcement" })).not.toBeInTheDocument();
      unmount();
    }
  });

  it("still renders the agency header and footer regardless of flag state", () => {
    vi.stubEnv("MASTERCLASS_REGISTRATION_ENABLED", "false");
    renderLayout();
    expect(screen.getByRole("link", { name: "Outbound BD — home" })).toBeInTheDocument();
    expect(screen.getByText("page content")).toBeInTheDocument();
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
