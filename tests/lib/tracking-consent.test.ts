import { describe, expect, it } from "vitest";

import {
  isTrackingAllowed,
  readCookieHeaderValue,
  regionFromCountryCode,
  shouldShowConsentBanner,
} from "@/lib/tracking/consent";

describe("regionFromCountryCode", () => {
  it("classifies an EU/EEA/UK geo header as eea", () => {
    expect(regionFromCountryCode("DE")).toBe("eea");
    expect(regionFromCountryCode("GB")).toBe("eea");
    expect(regionFromCountryCode("NO")).toBe("eea");
  });

  it("classifies anything else, including a missing header, as other", () => {
    expect(regionFromCountryCode("US")).toBe("other");
    expect(regionFromCountryCode(null)).toBe("other");
    expect(regionFromCountryCode(undefined)).toBe("other");
  });
});

describe("isTrackingAllowed", () => {
  it("is always allowed outside EEA/UK, regardless of consent", () => {
    expect(isTrackingAllowed({ region: "other", consent: undefined })).toBe(true);
    expect(isTrackingAllowed({ region: "other", consent: "denied" })).toBe(true);
  });

  it("is allowed inside EEA/UK only when consent was explicitly granted", () => {
    expect(isTrackingAllowed({ region: "eea", consent: "granted" })).toBe(true);
    expect(isTrackingAllowed({ region: "eea", consent: "denied" })).toBe(false);
    expect(isTrackingAllowed({ region: "eea", consent: undefined })).toBe(false);
  });

  it("treats a missing region as EEA/UK — the safe default", () => {
    expect(isTrackingAllowed({ region: undefined, consent: "granted" })).toBe(true);
    expect(isTrackingAllowed({ region: undefined, consent: undefined })).toBe(false);
  });
});

describe("shouldShowConsentBanner", () => {
  it("never shows outside EEA/UK", () => {
    expect(shouldShowConsentBanner({ region: "other", consent: undefined })).toBe(false);
  });

  it("shows inside EEA/UK only when no decision has been made yet", () => {
    expect(shouldShowConsentBanner({ region: "eea", consent: undefined })).toBe(true);
    expect(shouldShowConsentBanner({ region: "eea", consent: "granted" })).toBe(false);
    expect(shouldShowConsentBanner({ region: "eea", consent: "denied" })).toBe(false);
  });

  it("shows when the region is missing entirely — the safe default", () => {
    expect(shouldShowConsentBanner({ region: undefined, consent: undefined })).toBe(true);
  });
});

describe("readCookieHeaderValue", () => {
  it("reads the named cookie out of a multi-cookie header", () => {
    const header = "obd_region=eea; obd_ad_consent=granted; other=1";
    expect(readCookieHeaderValue(header, "obd_region")).toBe("eea");
    expect(readCookieHeaderValue(header, "obd_ad_consent")).toBe("granted");
  });

  it("returns undefined for a missing cookie or a missing header", () => {
    expect(readCookieHeaderValue("obd_region=eea", "obd_ad_consent")).toBeUndefined();
    expect(readCookieHeaderValue(null, "obd_region")).toBeUndefined();
  });

  it("URL-decodes the value", () => {
    expect(readCookieHeaderValue("obd_ad_consent=grant%20ed", "obd_ad_consent")).toBe("grant ed");
  });
});
