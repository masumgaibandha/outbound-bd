import { describe, expect, it } from "vitest";

import {
  REQUEST_PROPOSAL_HREF,
  STRATEGY_CALL_HREF,
  STRATEGY_CALL_LABEL,
  STRATEGY_CALL_LINK_PROPS,
} from "@/components/public/site-config";

describe("STRATEGY_CALL_HREF (Calendly configuration)", () => {
  it("points at the confirmed public Calendly booking link", () => {
    expect(STRATEGY_CALL_HREF).toBe("https://calendly.com/almasumbd/discovery-call");
  });

  it("is never a placeholder, empty string, '#', mailto:, or the /contact fallback", () => {
    expect(STRATEGY_CALL_HREF.trim().length).toBeGreaterThan(0);
    expect(STRATEGY_CALL_HREF).not.toBe("#");
    expect(STRATEGY_CALL_HREF).not.toBe(REQUEST_PROPOSAL_HREF);
    expect(STRATEGY_CALL_HREF.toLowerCase()).not.toContain("example.com");
    expect(STRATEGY_CALL_HREF.toLowerCase()).not.toContain("placeholder");
    expect(STRATEGY_CALL_HREF.toLowerCase()).not.toMatch(/^mailto:/);
  });

  it("uses the standardized booking CTA label", () => {
    expect(STRATEGY_CALL_LABEL).toBe("Book a Discovery Call");
  });

  it("opens safely in a new tab since the href is external", () => {
    expect(STRATEGY_CALL_LINK_PROPS).toEqual({
      target: "_blank",
      rel: "noopener noreferrer",
    });
  });
});
