// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";

import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// AgencyLeadForm calls `useRouter()`, which needs an app router context
// RTL doesn't provide.
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return { ...actual, useRouter: () => ({ push: vi.fn() }) };
});

// Vitest resolves static image imports to bare strings rather than
// `StaticImageData`, which `next/image` rejects without width/height. The
// page's layout isn't what's under test here, so a plain <img> stands in.
vi.mock("next/image", () => ({
  default: ({ src, alt }: ComponentProps<"img"> & { src: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : ""} alt={alt ?? ""} />
  ),
}));

import AgenciesLandingPage from "@/app/agencies/page";
import { FINAL_CTA_ID, GET_DETAILS_ID, HERO_ID } from "@/components/agencies/agency-anchors";
import { AgencyBookACallButton } from "@/components/agencies/agency-book-a-call-button";
import {
  EXAMPLE_CLIENT_CHARGE_CENTS,
  getAgencyMathFigures,
} from "@/components/agencies/agency-math-section";
import { campaignEvidence } from "@/components/public/campaign-evidence-data";
import { STRATEGY_CALL_HREF } from "@/components/public/site-config";
import { MANAGED_PLANS, formatPriceCents } from "@/lib/pricing-catalog";

type FbqMock = ReturnType<typeof vi.fn>;

function lowestCatalogMonthlyCents(): number {
  return Math.min(
    ...MANAGED_PLANS.flatMap((plan) =>
      plan.monthlyPriceCents === null ? [] : [plan.monthlyPriceCents],
    ),
  );
}

/** Minimal IntersectionObserver double that lets a test decide which
 * observed elements are on screen. */
class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  readonly targets: Element[] = [];
  constructor(private readonly callback: IntersectionObserverCallback) {
    FakeIntersectionObserver.instances.push(this);
  }
  observe(target: Element) {
    this.targets.push(target);
  }
  disconnect() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
  trigger(target: Element, isIntersecting: boolean, top = 100) {
    this.callback(
      [
        {
          target,
          isIntersecting,
          boundingClientRect: { top } as DOMRectReadOnly,
        } as IntersectionObserverEntry,
      ],
      this as unknown as IntersectionObserver,
    );
  }
}

beforeEach(() => {
  FakeIntersectionObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete (window as { fbq?: unknown }).fbq;
});

describe("/agencies math section", () => {
  it("computes every figure from the pricing catalog in integer cents", () => {
    const [charge, pays, keeps] = getAgencyMathFigures();
    const lowest = lowestCatalogMonthlyCents();

    expect(charge.cents).toBe(EXAMPLE_CLIENT_CHARGE_CENTS);
    expect(pays.cents).toBe(lowest);
    expect(keeps.cents).toBe(EXAMPLE_CLIENT_CHARGE_CENTS - lowest);
    for (const figure of [charge, pays, keeps]) {
      expect(Number.isInteger(figure.cents)).toBe(true);
    }
  });

  it("renders the catalog-derived figures on the page", () => {
    render(<AgenciesLandingPage />);
    const lowest = lowestCatalogMonthlyCents();
    const figures = screen.getAllByTestId("agency-math-figure").map((el) => el.textContent);

    expect(figures).toEqual([
      `You charge your client${formatPriceCents(EXAMPLE_CLIENT_CHARGE_CENTS)}/month`,
      `You pay from${formatPriceCents(lowest)}/month`,
      `You keep${formatPriceCents(EXAMPLE_CLIENT_CHARGE_CENTS - lowest)}/month`,
    ]);
  });

  it("never hardcodes the starting price or the margin", () => {
    const source = readFileSync(
      path.resolve(__dirname, "../../src/components/agencies/agency-math-section.tsx"),
      "utf-8",
    );
    expect(source).not.toMatch(/499|1,?001/);
  });
});

describe("/agencies Book a call button", () => {
  it("links to the configured booking URL in a new tab", () => {
    render(<AgencyBookACallButton />);
    const link = screen.getByRole("link", { name: "Book a call" });
    expect(link).toHaveAttribute("href", STRATEGY_CALL_HREF);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("fires a Contact pixel event on click and never Lead", async () => {
    const fbq: FbqMock = vi.fn();
    (window as { fbq?: unknown }).fbq = fbq;
    render(<AgencyBookACallButton />);
    const link = screen.getByRole("link", { name: "Book a call" });
    // Keep jsdom from attempting the navigation.
    link.addEventListener("click", (event) => event.preventDefault());

    await userEvent.click(link);

    expect(fbq).toHaveBeenCalledTimes(1);
    expect(fbq).toHaveBeenCalledWith("track", "Contact");
    expect(fbq.mock.calls.some((call) => call.includes("Lead"))).toBe(false);
  });

  it("does nothing when the pixel never loaded (no consent)", async () => {
    render(<AgencyBookACallButton />);
    const link = screen.getByRole("link", { name: "Book a call" });
    link.addEventListener("click", (event) => event.preventDefault());
    await expect(userEvent.click(link)).resolves.not.toThrow();
  });
});

describe("/agencies page structure", () => {
  it("wraps the lead form in the #get-details section", () => {
    const { container } = render(<AgenciesLandingPage />);
    const section = container.querySelector(`section#${GET_DETAILS_ID}`);
    expect(section).not.toBeNull();
    expect(section?.querySelector("form#lead-form")).not.toBeNull();
    expect(
      within(section as HTMLElement).getByRole("heading", { name: "Get the white-label details" }),
    ).toBeInTheDocument();
    expect(
      within(section as HTMLElement).getByRole("button", { name: "Send my details" }),
    ).toBeInTheDocument();
  });

  it("points every Get the details button at the form section", () => {
    render(<AgenciesLandingPage />);
    const links = screen.getAllByRole("link", { name: "Get the details", hidden: true });
    // Hero, final CTA, sticky mobile bar.
    expect(links).toHaveLength(3);
    for (const link of links) {
      expect(link).toHaveAttribute("href", `#${GET_DETAILS_ID}`);
    }
  });

  it("smooth-scrolls to the form on click", async () => {
    const { container } = render(<AgenciesLandingPage />);
    const heroLink = screen.getAllByRole("link", { name: "Get the details" })[0];
    const section = container.querySelector(`#${GET_DETAILS_ID}`) as HTMLElement;
    const scrollSpy = vi.spyOn(section, "scrollIntoView");

    await userEvent.click(heroLink);

    expect(scrollSpy).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("drops the old comparison and pricing sections", () => {
    render(<AgenciesLandingPage />);
    expect(screen.queryByText("Cold email is not email marketing")).toBeNull();
    expect(screen.queryByText("Simple pricing per client campaign")).toBeNull();
    expect(screen.getByText("Isn't this just email marketing?")).toBeInTheDocument();
  });

  it("shows the Instantly screenshot with the one-line caption", () => {
    render(<AgenciesLandingPage />);
    expect(
      screen.getByText("Real client campaigns. Results vary by offer and market."),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Enlarge screenshot: Instantly campaign report/ })).toHaveLength(1);
  });

  it("drops the screenshot's note on this page only, inline and in the lightbox", async () => {
    const sharedNote = campaignEvidence.find((item) => item.id === "instantly-2025-08-05")?.note;
    // The shared data file keeps its note for the homepage and /results.
    expect(sharedNote).toBeTruthy();

    render(<AgenciesLandingPage />);
    expect(screen.queryByText(sharedNote!)).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: /^Enlarge screenshot:/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByText(sharedNote!)).toBeNull();
  });
});

describe("/agencies sticky mobile CTA", () => {
  function sticky() {
    return screen.getByTestId("agency-sticky-cta");
  }

  function setup() {
    const { container } = render(<AgenciesLandingPage />);
    const observer = FakeIntersectionObserver.instances.at(-1)!;
    const el = (id: string) => container.querySelector(`#${id}`)!;
    return { observer, hero: el(HERO_ID), form: el(GET_DETAILS_ID), finalCta: el(FINAL_CTA_ID) };
  }

  it("observes the hero, the form section and the final CTA", () => {
    const { observer, hero, form, finalCta } = setup();
    expect(observer.targets).toEqual([hero, form, finalCta]);
  });

  it("starts hidden and stays hidden while the hero is on screen", () => {
    const { observer, hero } = setup();
    expect(sticky()).toHaveAttribute("data-hidden", "true");
    expect(sticky()).toHaveAttribute("inert");

    act(() => observer.trigger(hero, true));
    expect(sticky()).toHaveAttribute("data-hidden", "true");
    act(() => observer.trigger(hero, false, -600));
    expect(sticky()).toHaveAttribute("data-hidden", "false");
    expect(sticky()).not.toHaveAttribute("inert");
    act(() => observer.trigger(hero, true));
    expect(sticky()).toHaveAttribute("data-hidden", "true");
  });

  it("hides while the form section is on screen", () => {
    const { observer, hero, form } = setup();
    act(() => observer.trigger(hero, false, -600));
    expect(sticky()).toHaveAttribute("data-hidden", "false");

    act(() => observer.trigger(form, true));
    expect(sticky()).toHaveAttribute("data-hidden", "true");
    act(() => observer.trigger(form, false));
    expect(sticky()).toHaveAttribute("data-hidden", "false");
  });

  it("stays hidden once the final CTA is reached or passed", () => {
    const { observer, hero, finalCta } = setup();
    act(() => observer.trigger(hero, false, -600));

    act(() => observer.trigger(finalCta, true));
    expect(sticky()).toHaveAttribute("data-hidden", "true");
    act(() => observer.trigger(finalCta, false, -50));
    expect(sticky()).toHaveAttribute("data-hidden", "true");
    act(() => observer.trigger(finalCta, false, 900));
    expect(sticky()).toHaveAttribute("data-hidden", "false");
  });
});
