// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const consumePrefillMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/agency-lead-prefill", () => ({
  consumeAgencyLeadPrefill: consumePrefillMock,
}));

const getStoredAttributionMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/agency-attribution", () => ({
  getStoredAgencyAttribution: getStoredAttributionMock,
}));

import { CalendlyInlineEmbed } from "@/components/agencies/calendly-inline-embed";

const initInlineWidgetMock = vi.hoisted(() => vi.fn());

interface CalendlyWindow {
  Calendly?: { initInlineWidget: typeof initInlineWidgetMock };
}

function lastCallOptions() {
  const [options] = initInlineWidgetMock.mock.calls[initInlineWidgetMock.mock.calls.length - 1];
  return options as {
    url: string;
    parentElement: HTMLElement;
    prefill?: { name?: string; email?: string };
    utm?: Record<string, string | undefined>;
  };
}

beforeEach(() => {
  initInlineWidgetMock.mockReset();
  consumePrefillMock.mockReset();
  consumePrefillMock.mockReturnValue(null);
  getStoredAttributionMock.mockReset();
  getStoredAttributionMock.mockReturnValue({});
  // Simulates the Calendly script already having loaded — the component's
  // mount effect calls initWidget() directly, independent of next/script's
  // own onLoad (which jsdom won't fire for a real external src), so this is
  // enough to exercise the real init path.
  (window as unknown as CalendlyWindow).Calendly = { initInlineWidget: initInlineWidgetMock };
});

afterEach(() => {
  delete (window as unknown as CalendlyWindow).Calendly;
});

describe("CalendlyInlineEmbed — display options", () => {
  it("passes hide_event_type_details=1 and hide_gdpr_banner=1 as query params on the embed url", () => {
    render(<CalendlyInlineEmbed utmContent="agencies-cold-email" />);
    const url = new URL(lastCallOptions().url);
    expect(url.searchParams.get("hide_event_type_details")).toBe("1");
    expect(url.searchParams.get("hide_gdpr_banner")).toBe("1");
  });

  it("still points at the real Calendly booking path", () => {
    render(<CalendlyInlineEmbed utmContent="agencies-cold-email" />);
    const url = new URL(lastCallOptions().url);
    expect(url.hostname).toBe("calendly.com");
    expect(url.pathname).toBe("/almasumbd/discovery-call");
  });
});

describe("CalendlyInlineEmbed — utm", () => {
  it("defaults utmSource/utmMedium/utmCampaign, and sends the utmContent prop, when no attribution was captured", () => {
    render(<CalendlyInlineEmbed utmContent="agencies-cold-email" />);
    expect(lastCallOptions().utm).toEqual({
      utmSource: "outboundbd",
      utmMedium: "website",
      utmCampaign: "agencies",
      utmContent: "agencies-cold-email",
    });
  });

  it("uses the visitor's first-touch UTM values when present, overriding the defaults", () => {
    getStoredAttributionMock.mockReturnValue({
      utmSource: "facebook",
      utmMedium: "cpc",
      utmCampaign: "fall-launch",
      utmTerm: "cold email agency",
    });
    render(<CalendlyInlineEmbed utmContent="agencies-cold-email" />);
    expect(lastCallOptions().utm).toEqual({
      utmSource: "facebook",
      utmMedium: "cpc",
      utmCampaign: "fall-launch",
      utmContent: "agencies-cold-email",
      utmTerm: "cold email agency",
    });
  });

  it("omits utmTerm entirely when no first-touch utm_term was captured, rather than sending it empty", () => {
    render(<CalendlyInlineEmbed utmContent="agencies-cold-email" />);
    expect(lastCallOptions().utm).not.toHaveProperty("utmTerm");
  });

  it("is reusable: a different utmContent prop is sent verbatim, for a future landing page's own thank-you page", () => {
    render(<CalendlyInlineEmbed utmContent="other-landing-page" />);
    expect(lastCallOptions().utm?.utmContent).toBe("other-landing-page");
  });

  it("falls back to a single default individually per field — a partial first-touch capture doesn't blank out the others", () => {
    getStoredAttributionMock.mockReturnValue({ utmSource: "facebook" });
    render(<CalendlyInlineEmbed utmContent="agencies-cold-email" />);
    expect(lastCallOptions().utm).toEqual({
      utmSource: "facebook",
      utmMedium: "website",
      utmCampaign: "agencies",
      utmContent: "agencies-cold-email",
    });
  });

  it("never includes name, email, or any prefill data inside the utm object", () => {
    consumePrefillMock.mockReturnValue({ name: "Taylor Smith", email: "taylor@agency.com" });
    render(<CalendlyInlineEmbed utmContent="agencies-cold-email" />);
    const serialized = JSON.stringify(lastCallOptions().utm);
    expect(serialized).not.toContain("Taylor");
    expect(serialized).not.toContain("taylor@agency.com");
  });
});

describe("CalendlyInlineEmbed — prefill stays out of the URL (unchanged behavior)", () => {
  it("still passes prefill separately via the options object when a lead prefill was stored", () => {
    consumePrefillMock.mockReturnValue({ name: "Taylor Smith", email: "taylor@agency.com" });
    render(<CalendlyInlineEmbed utmContent="agencies-cold-email" />);
    expect(lastCallOptions().prefill).toEqual({ name: "Taylor Smith", email: "taylor@agency.com" });
  });

  it("never puts the prefilled name/email into the embed url", () => {
    consumePrefillMock.mockReturnValue({ name: "Taylor Smith", email: "taylor@agency.com" });
    render(<CalendlyInlineEmbed utmContent="agencies-cold-email" />);
    expect(lastCallOptions().url).not.toContain("Taylor");
    expect(lastCallOptions().url).not.toContain("taylor@agency.com");
  });
});

describe("CalendlyInlineEmbed — init guard", () => {
  it("calls initInlineWidget at most once even if re-rendered with the same utmContent", () => {
    const { rerender } = render(<CalendlyInlineEmbed utmContent="agencies-cold-email" />);
    rerender(<CalendlyInlineEmbed utmContent="agencies-cold-email" />);
    expect(initInlineWidgetMock).toHaveBeenCalledTimes(1);
  });

  it("does nothing when window.Calendly isn't defined yet", () => {
    delete (window as unknown as CalendlyWindow).Calendly;
    render(<CalendlyInlineEmbed utmContent="agencies-cold-email" />);
    expect(initInlineWidgetMock).not.toHaveBeenCalled();
  });
});
