// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { captureAgencyAttributionOnLoad, getStoredAgencyAttribution } from "@/lib/agency-attribution";

function setUrl(pathAndQuery: string) {
  window.history.replaceState({}, "", pathAndQuery);
}

beforeEach(() => {
  window.sessionStorage.clear();
  setUrl("/agencies");
});

afterEach(() => {
  window.sessionStorage.clear();
});

describe("captureAgencyAttributionOnLoad / getStoredAgencyAttribution", () => {
  it("captures UTM params, fbclid, and the landing path from the URL", () => {
    setUrl(
      "/agencies?utm_source=facebook&utm_medium=cpc&utm_campaign=launch&utm_content=ad1&utm_term=cold+email&fbclid=abc123",
    );
    captureAgencyAttributionOnLoad();

    const stored = getStoredAgencyAttribution();
    expect(stored.utmSource).toBe("facebook");
    expect(stored.utmMedium).toBe("cpc");
    expect(stored.utmCampaign).toBe("launch");
    expect(stored.utmContent).toBe("ad1");
    expect(stored.utmTerm).toBe("cold email");
    expect(stored.fbclid).toBe("abc123");
    expect(stored.landingPath).toBe("/agencies");
  });

  it("stores only the landing path when no UTM/fbclid params are present", () => {
    setUrl("/agencies");
    captureAgencyAttributionOnLoad();

    const stored = getStoredAgencyAttribution();
    expect(stored.landingPath).toBe("/agencies");
    expect(stored.utmSource).toBeUndefined();
    expect(stored.fbclid).toBeUndefined();
  });

  it("is first-touch: a second call with different URL params never overwrites what was already captured", () => {
    setUrl("/agencies?utm_source=facebook&utm_campaign=first");
    captureAgencyAttributionOnLoad();

    setUrl("/agencies?utm_source=google&utm_campaign=second");
    captureAgencyAttributionOnLoad();

    const stored = getStoredAgencyAttribution();
    expect(stored.utmSource).toBe("facebook");
    expect(stored.utmCampaign).toBe("first");
  });

  it("getStoredAgencyAttribution returns {} when nothing was ever captured", () => {
    expect(getStoredAgencyAttribution()).toEqual({});
  });

  it("returns {} for corrupted sessionStorage content instead of throwing", () => {
    window.sessionStorage.setItem("obd_agency_attribution", "{not valid json");
    expect(() => getStoredAgencyAttribution()).not.toThrow();
    expect(getStoredAgencyAttribution()).toEqual({});
  });
});
