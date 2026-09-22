// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// MetaPixel renders a next/script bootstrap tag whose actual DOM insertion
// behavior under jsdom (outside a real Next.js runtime) isn't this test's
// concern — TrackingGate's own decision logic (which of pixel/banner to
// render, for which visitor) is. Same isolation approach the existing
// public-layout-banner test uses for Logo.
vi.mock("@/components/public/meta-pixel", () => ({
  MetaPixel: ({ pixelId }: { pixelId: string }) => (
    <div data-testid="meta-pixel" data-pixel-id={pixelId} />
  ),
}));

import { TrackingGate } from "@/components/public/tracking-gate";

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/`;
}

function clearAllCookies() {
  for (const pair of document.cookie.split(";")) {
    const name = pair.split("=")[0]?.trim();
    if (name) document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
}

beforeEach(() => {
  clearAllCookies();
  vi.unstubAllEnvs();
  vi.stubEnv("NEXT_PUBLIC_AGENCY_META_PIXEL_ID", "123456");
});

afterEach(() => {
  clearAllCookies();
  vi.unstubAllEnvs();
});

describe("TrackingGate", () => {
  it("renders nothing when the agency pixel ID is not configured", () => {
    vi.stubEnv("NEXT_PUBLIC_AGENCY_META_PIXEL_ID", "");
    setCookie("obd_region", "other");
    const { container } = render(<TrackingGate />);
    expect(container.innerHTML).toBe("");
  });

  it("loads the pixel immediately for a non-EEA/UK visitor, with no banner", () => {
    setCookie("obd_region", "other");
    render(<TrackingGate />);
    expect(screen.getByTestId("meta-pixel")).toHaveAttribute("data-pixel-id", "123456");
    expect(screen.queryByRole("region", { name: "Cookie consent" })).not.toBeInTheDocument();
  });

  it("shows the banner and withholds the pixel for an EEA/UK visitor with no prior decision", () => {
    setCookie("obd_region", "eea");
    render(<TrackingGate />);
    expect(screen.getByRole("region", { name: "Cookie consent" })).toBeInTheDocument();
    expect(screen.queryByTestId("meta-pixel")).not.toBeInTheDocument();
  });

  it("treats a missing region cookie as EEA/UK — the safe default", () => {
    // No obd_region cookie set at all.
    render(<TrackingGate />);
    expect(screen.getByRole("region", { name: "Cookie consent" })).toBeInTheDocument();
    expect(screen.queryByTestId("meta-pixel")).not.toBeInTheDocument();
  });

  it("loads the pixel and hides the banner for an EEA/UK visitor who already granted consent", () => {
    setCookie("obd_region", "eea");
    setCookie("obd_ad_consent", "granted");
    render(<TrackingGate />);
    expect(screen.getByTestId("meta-pixel")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Cookie consent" })).not.toBeInTheDocument();
  });

  it("withholds the pixel and hides the banner for an EEA/UK visitor who already declined", () => {
    setCookie("obd_region", "eea");
    setCookie("obd_ad_consent", "denied");
    render(<TrackingGate />);
    expect(screen.queryByTestId("meta-pixel")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Cookie consent" })).not.toBeInTheDocument();
  });

  it("accepting the banner loads the pixel and dismisses the banner without a page reload", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    setCookie("obd_region", "eea");
    const user = userEvent.setup();
    render(<TrackingGate />);

    await user.click(screen.getByRole("button", { name: "Accept" }));

    expect(screen.getByTestId("meta-pixel")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Cookie consent" })).not.toBeInTheDocument();
    expect(document.cookie).toContain("obd_ad_consent=granted");
  });

  it("declining the banner dismisses it and never loads the pixel", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    setCookie("obd_region", "eea");
    const user = userEvent.setup();
    render(<TrackingGate />);

    await user.click(screen.getByRole("button", { name: "Decline" }));

    expect(screen.queryByTestId("meta-pixel")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Cookie consent" })).not.toBeInTheDocument();
    expect(document.cookie).toContain("obd_ad_consent=denied");
  });
});
