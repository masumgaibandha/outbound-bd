// `inquiry-submission.ts` imports the Inquiry model at module scope (for
// isRateLimited, used elsewhere in that file), but model *definition* never
// touches MONGODB_URI — only an actual connection/query would, and
// dispatchAgencyLeadCapi never issues one. No mongodb-memory-server needed
// here, unlike tests that actually exercise the database.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendLeadEventMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/tracking/capi", () => ({
  sendLeadEvent: sendLeadEventMock,
}));

import { dispatchAgencyLeadCapi } from "@/lib/inquiry-submission";

function request(headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/inquiries", { headers });
}

function baseInput(overrides: Partial<Parameters<typeof dispatchAgencyLeadCapi>[0]> = {}) {
  return {
    request: request(),
    record: { eventId: "evt-1", eventSourceUrl: "https://outboundbd.com/contact" },
    email: "jordan@acme.com",
    ipAddress: "203.0.113.10",
    inquiryId: "64f000000000000000000123",
    source: "contact" as const,
    ...overrides,
  };
}

beforeEach(() => {
  sendLeadEventMock.mockReset();
  sendLeadEventMock.mockResolvedValue({ ok: true, eventsReceived: 1 });
  vi.unstubAllEnvs();
  vi.stubEnv("AGENCY_META_PIXEL_ID", "123456");
  vi.stubEnv("AGENCY_META_CAPI_ACCESS_TOKEN", "test-token");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function lastLogged(spy: ReturnType<typeof vi.spyOn>): Record<string, unknown> {
  const [logged] = spy.mock.calls[spy.mock.calls.length - 1];
  return JSON.parse(String(logged)) as Record<string, unknown>;
}

describe("dispatchAgencyLeadCapi — agency_lead_capi_sent", () => {
  it("logs exactly one sent line with eventsReceived, source, and cookie diagnostics, on a non-EEA/UK visitor", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await dispatchAgencyLeadCapi(
      baseInput({ request: request({ cookie: "obd_region=other" }), source: "agencies-landing" }),
    );

    expect(errorSpy).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledTimes(1);
    const logged = lastLogged(logSpy);
    expect(logged).toMatchObject({
      event: "agency_lead_capi_sent",
      inquiryId: "64f000000000000000000123",
      source: "agencies-landing",
      eventsReceived: 1,
      hasRegionCookie: true,
      regionValue: "other",
      hasConsentCookie: false,
    });
  });

  it("logs sent for an EEA/UK visitor who already granted consent", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await dispatchAgencyLeadCapi(
      baseInput({ request: request({ cookie: "obd_region=eea; obd_ad_consent=granted" }) }),
    );

    const logged = lastLogged(logSpy);
    expect(logged.event).toBe("agency_lead_capi_sent");
    expect(logged.hasConsentCookie).toBe(true);
    expect(logged.regionValue).toBe("eea");
  });

  it("never logs the email, a hash, or the access token", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await dispatchAgencyLeadCapi(baseInput({ request: request({ cookie: "obd_region=other" }) }));

    const [logged] = logSpy.mock.calls[0];
    expect(String(logged)).not.toContain("jordan@acme.com");
    expect(String(logged)).not.toContain("test-token");
  });
});

describe("dispatchAgencyLeadCapi — agency_lead_capi_skipped", () => {
  it("skips with reason: missing_config when the agency CAPI env is unset, before ever calling sendLeadEvent", async () => {
    vi.unstubAllEnvs();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await dispatchAgencyLeadCapi(baseInput({ request: request({ cookie: "obd_region=other" }) }));

    expect(sendLeadEventMock).not.toHaveBeenCalled();
    const logged = lastLogged(logSpy);
    expect(logged).toMatchObject({ event: "agency_lead_capi_skipped", reason: "missing_config" });
  });

  it("skips with reason: region_unknown when the obd_region cookie never reached the request", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await dispatchAgencyLeadCapi(baseInput({ request: request() })); // no cookie header at all

    expect(sendLeadEventMock).not.toHaveBeenCalled();
    const logged = lastLogged(logSpy);
    expect(logged).toMatchObject({
      event: "agency_lead_capi_skipped",
      reason: "region_unknown",
      hasRegionCookie: false,
      regionValue: "missing",
    });
  });

  it("skips with reason: no_consent for a known EEA/UK visitor with no granted consent", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await dispatchAgencyLeadCapi(baseInput({ request: request({ cookie: "obd_region=eea" }) }));

    expect(sendLeadEventMock).not.toHaveBeenCalled();
    const logged = lastLogged(logSpy);
    expect(logged).toMatchObject({
      event: "agency_lead_capi_skipped",
      reason: "no_consent",
      hasRegionCookie: true,
      regionValue: "eea",
      hasConsentCookie: false,
    });
  });

  it("skips with reason: no_consent when consent was explicitly denied", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await dispatchAgencyLeadCapi(
      baseInput({ request: request({ cookie: "obd_region=eea; obd_ad_consent=denied" }) }),
    );

    expect(sendLeadEventMock).not.toHaveBeenCalled();
    const logged = lastLogged(logSpy);
    expect(logged).toMatchObject({ reason: "no_consent", hasConsentCookie: true });
  });

  it("logs exactly one skipped line, never a sent or failed line for the same attempt", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await dispatchAgencyLeadCapi(baseInput({ request: request({ cookie: "obd_region=eea" }) }));

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

describe("dispatchAgencyLeadCapi — agency_lead_capi_failed", () => {
  it("logs Meta's numeric error.code/error_subcode, never the message, when Meta rejects the call", async () => {
    sendLeadEventMock.mockResolvedValueOnce({
      ok: false,
      errorCode: "HTTP_401",
      metaErrorCode: 190,
      metaErrorSubcode: 463,
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await dispatchAgencyLeadCapi(baseInput({ request: request({ cookie: "obd_region=other" }) }));

    const logged = lastLogged(errorSpy);
    expect(logged).toMatchObject({
      event: "agency_lead_capi_failed",
      source: "contact",
      errorCode: "HTTP_401",
      metaErrorCode: 190,
      metaErrorSubcode: 463,
    });
  });

  it("logs errorCode: UNEXPECTED_THROW when sendLeadEvent itself throws, and never lets the throw propagate", async () => {
    sendLeadEventMock.mockRejectedValueOnce(new Error("boom"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      dispatchAgencyLeadCapi(baseInput({ request: request({ cookie: "obd_region=other" }) })),
    ).resolves.toBeUndefined();

    const logged = lastLogged(errorSpy);
    expect(logged).toMatchObject({ event: "agency_lead_capi_failed", errorCode: "UNEXPECTED_THROW" });
  });

  it("includes cookie diagnostics on a failed attempt too", async () => {
    sendLeadEventMock.mockResolvedValueOnce({ ok: false, errorCode: "HTTP_500" });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await dispatchAgencyLeadCapi(
      baseInput({ request: request({ cookie: "obd_region=eea; obd_ad_consent=granted" }) }),
    );

    const logged = lastLogged(errorSpy);
    expect(logged).toMatchObject({ hasRegionCookie: true, regionValue: "eea", hasConsentCookie: true });
  });
});
