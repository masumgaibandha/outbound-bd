// Must be the first import — sets MONGODB_URI to an isolated in-memory
// instance before env.ts / mongoose.ts / the route handler are imported.
import { mongod } from "../helpers/mongodb-memory-server";

import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Real Resend is never called in this suite. Most tests below leave
// RESEND_API_KEY/RESEND_FROM_EMAIL/CONTACT_NOTIFICATION_EMAIL unset — in
// that state `sendContactNotification()` returns before ever constructing a
// `Resend` client, so this mock only actually matters for the
// "contact-notification integration" describe block below, which stubs
// those env vars explicitly.
const sendMock = vi.hoisted(() => vi.fn());
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

// Real Meta Conversions API is never called in this suite — only the
// "agency Meta CAPI Lead event" describe block below stubs
// AGENCY_META_PIXEL_ID/AGENCY_META_CAPI_ACCESS_TOKEN, so this mock only
// actually matters there.
const sendLeadEventMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/tracking/capi", () => ({
  sendLeadEvent: sendLeadEventMock,
}));

import { POST } from "@/app/api/inquiries/route";
import { connectToDatabase } from "@/lib/mongoose";
import { Inquiry } from "@/lib/models/inquiry";

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Jordan Rivera",
    email: "jordan@acme.com",
    company: "Acme Inc",
    website: "https://acme.com",
    service: "cold-email-outreach",
    targetMarket: "Mid-market SaaS, US & UK",
    monthlyOutreachVolume: "2000-5000",
    budgetRange: "1k-plus",
    currentOutreachSetup: "One shared inbox, no dedicated infra",
    goals: "Book 15+ qualified sales calls per month by Q4.",
    privacyConsent: true,
    honeypot: "",
    startedAt: Date.now() - 5000,
    ...overrides,
  };
}

function postRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/inquiries", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  await connectToDatabase();
});

beforeEach(async () => {
  await Inquiry.deleteMany({});
  sendMock.mockReset();
  sendMock.mockResolvedValue({ data: { id: "email_1" }, error: null });
  sendLeadEventMock.mockReset();
  sendLeadEventMock.mockResolvedValue({ ok: true });
  vi.unstubAllEnvs();
});

afterEach(async () => {
  await Inquiry.deleteMany({});
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("POST /api/inquiries", () => {
  it("persists a valid inquiry, including the new required fields", async () => {
    const response = await POST(postRequest(validPayload()));
    expect(response.status).toBe(201);

    const saved = await Inquiry.findOne({ email: "jordan@acme.com" });
    expect(saved).not.toBeNull();
    expect(saved?.company).toBe("Acme Inc");
    expect(saved?.targetMarket).toBe("Mid-market SaaS, US & UK");
    expect(saved?.monthlyOutreachVolume).toBe("2000-5000");
    expect(saved?.currentOutreachSetup).toBe(
      "One shared inbox, no dedicated infra",
    );
    expect(saved?.privacyConsent).toBe(true);
    expect(saved?.status).toBe("NEW");
  });

  it("rejects an invalid email and returns field errors, without persisting", async () => {
    const response = await POST(
      postRequest(validPayload({ email: "not-an-email" })),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { fieldErrors?: Record<string, string> };
    expect(body.fieldErrors?.email).toBeTruthy();

    const count = await Inquiry.countDocuments({});
    expect(count).toBe(0);
  });

  it("rejects a submission missing required fields", async () => {
    const payload = validPayload();
    delete (payload as Record<string, unknown>).goals;
    const response = await POST(postRequest(payload));
    expect(response.status).toBe(400);
    const count = await Inquiry.countDocuments({});
    expect(count).toBe(0);
  });

  it("rejects a submission without privacy consent", async () => {
    const response = await POST(
      postRequest(validPayload({ privacyConsent: false })),
    );
    expect(response.status).toBe(400);
    const count = await Inquiry.countDocuments({});
    expect(count).toBe(0);
  });

  it("silently discards a honeypot-tripped submission", async () => {
    const response = await POST(
      postRequest(validPayload({ honeypot: "http://spam.example" })),
    );
    // Reports success so the bot gets no signal, but nothing is persisted.
    expect(response.status).toBe(201);
    const count = await Inquiry.countDocuments({});
    expect(count).toBe(0);
  });

  it("silently discards a submission that was too fast to be human", async () => {
    const response = await POST(
      postRequest(validPayload({ startedAt: Date.now() })),
    );
    expect(response.status).toBe(201);
    const count = await Inquiry.countDocuments({});
    expect(count).toBe(0);
  });

  it("treats a same email+company resubmission within the window as idempotent", async () => {
    const first = await POST(postRequest(validPayload()));
    expect(first.status).toBe(201);

    const second = await POST(
      postRequest(validPayload({ goals: "A slightly different goals text." })),
    );
    expect(second.status).toBe(201);

    const count = await Inquiry.countDocuments({
      email: "jordan@acme.com",
      company: "Acme Inc",
    });
    expect(count).toBe(1);
  });

  it("allows a second inquiry from a different company for the same email", async () => {
    await POST(postRequest(validPayload()));
    await POST(postRequest(validPayload({ company: "A Different Co" })));

    const count = await Inquiry.countDocuments({ email: "jordan@acme.com" });
    expect(count).toBe(2);
  });
});

describe("POST /api/inquiries — contact notification", () => {
  function stubNotificationEnv() {
    vi.stubEnv("RESEND_API_KEY", "test-resend-key");
    vi.stubEnv("RESEND_FROM_EMAIL", "Outbound BD <notifications@updates.outboundbd.com>");
    vi.stubEnv("CONTACT_NOTIFICATION_EMAIL", "hello@outboundbd.com");
  }

  it("saves the inquiry before attempting notification, and sends exactly one notification after", async () => {
    stubNotificationEnv();
    let sawPersistedDocWhenSending = false;
    sendMock.mockImplementation(async () => {
      const saved = await Inquiry.findOne({ email: "jordan@acme.com" });
      sawPersistedDocWhenSending = saved !== null;
      return { data: { id: "email_1" }, error: null };
    });

    const response = await POST(postRequest(validPayload()));
    expect(response.status).toBe(201);
    expect(sawPersistedDocWhenSending).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(1);

    const saved = await Inquiry.findOne({ email: "jordan@acme.com" });
    const [payload] = sendMock.mock.calls[0];
    expect(payload.to).toBe("hello@outboundbd.com");
    expect(payload.from).toBe("Outbound BD <notifications@updates.outboundbd.com>");
    expect(payload.replyTo).toBe("jordan@acme.com");
    expect(payload.html).toContain(String(saved?._id));
  });

  it("sends no notification for an invalid submission", async () => {
    stubNotificationEnv();
    const response = await POST(postRequest(validPayload({ email: "not-an-email" })));
    expect(response.status).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("returns a friendly JSON 500 (not an unhandled throw) and sends no notification when MongoDB persistence fails", async () => {
    stubNotificationEnv();
    const createSpy = vi.spyOn(Inquiry, "create").mockRejectedValueOnce(new Error("connection lost"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(postRequest(validPayload()));
    expect(response.status).toBe(500);
    const body = (await response.json()) as { ok: boolean; message: string };
    expect(body.ok).toBe(false);
    expect(body.message).toBeTruthy();
    expect(sendMock).not.toHaveBeenCalled();

    // Logged diagnostic is structured and non-sensitive — never the raw
    // error message (which could echo a connection string), never PII.
    const failureLog = errorSpy.mock.calls
      .map(([logged]) => String(logged))
      .find((logged) => logged.includes("inquiry_persist_failed"));
    expect(failureLog).toBeTruthy();
    expect(failureLog).not.toContain("connection lost");
    expect(failureLog).not.toContain("jordan@acme.com");

    createSpy.mockRestore();
    errorSpy.mockRestore();
    const count = await Inquiry.countDocuments({ email: "jordan@acme.com" });
    expect(count).toBe(0);
  });

  it("still returns the normal successful response, with the inquiry persisted, when Resend fails", async () => {
    stubNotificationEnv();
    sendMock.mockRejectedValueOnce(new Error("network down"));

    const response = await POST(postRequest(validPayload()));
    expect(response.status).toBe(201);
    const body = (await response.json()) as { ok: boolean };
    expect(body.ok).toBe(true);

    const saved = await Inquiry.findOne({ email: "jordan@acme.com" });
    expect(saved).not.toBeNull();
  });

  it("persists successfully and reports success when notification configuration is entirely missing", async () => {
    // No stubNotificationEnv() call — RESEND_API_KEY / RESEND_FROM_EMAIL /
    // CONTACT_NOTIFICATION_EMAIL are all unset, exactly like every other
    // test in this file.
    const response = await POST(postRequest(validPayload()));
    expect(response.status).toBe(201);
    expect(sendMock).not.toHaveBeenCalled();

    const saved = await Inquiry.findOne({ email: "jordan@acme.com" });
    expect(saved).not.toBeNull();
  });

  it("logs only the inquiry ID and a non-sensitive error classification on notification failure — no PII, no credentials, no provider response body", async () => {
    stubNotificationEnv();
    sendMock.mockResolvedValueOnce({
      data: null,
      error: { message: "Sensitive provider detail that must never be logged" },
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await POST(postRequest(validPayload()));

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [logged] = errorSpy.mock.calls[0];
    expect(typeof logged).toBe("string");
    const parsed = JSON.parse(logged as string) as Record<string, unknown>;
    expect(parsed.event).toBe("contact_notification_failed");
    expect(parsed.errorCode).toBe("PROVIDER_ERROR");
    expect(typeof parsed.inquiryId).toBe("string");

    const loggedText = logged as string;
    expect(loggedText).not.toContain("Jordan Rivera");
    expect(loggedText).not.toContain("jordan@acme.com");
    expect(loggedText).not.toContain("test-resend-key");
    expect(loggedText).not.toContain("Sensitive provider detail");

    errorSpy.mockRestore();
  });
});

describe("POST /api/inquiries — agency Meta CAPI Lead event", () => {
  function stubCapiEnv() {
    vi.stubEnv("AGENCY_META_PIXEL_ID", "123456");
    vi.stubEnv("AGENCY_META_CAPI_ACCESS_TOKEN", "test-capi-token");
  }

  it("sends exactly one Lead event, after the inquiry is persisted, for a valid non-EEA/UK submission", async () => {
    stubCapiEnv();
    let sawPersistedDocWhenSending = false;
    sendLeadEventMock.mockImplementation(async () => {
      const saved = await Inquiry.findOne({ email: "jordan@acme.com" });
      sawPersistedDocWhenSending = saved !== null;
      return { ok: true };
    });

    const response = await POST(
      postRequest(validPayload({ eventId: "evt-abc" }), { cookie: "obd_region=other" }),
    );
    expect(response.status).toBe(201);
    expect(sawPersistedDocWhenSending).toBe(true);
    expect(sendLeadEventMock).toHaveBeenCalledTimes(1);

    const [input] = sendLeadEventMock.mock.calls[0];
    expect(input.eventId).toBe("evt-abc");
    expect(input.email).toBe("jordan@acme.com");
    expect(input.pixelId).toBe("123456");
    expect(input.accessToken).toBe("test-capi-token");
  });

  it("sends no Lead event when Meta CAPI config is entirely missing", async () => {
    // No stubCapiEnv() call.
    const response = await POST(postRequest(validPayload()));
    expect(response.status).toBe(201);
    expect(sendLeadEventMock).not.toHaveBeenCalled();
  });

  it("sends no Lead event for a honeypot-tripped submission", async () => {
    stubCapiEnv();
    const response = await POST(
      postRequest(validPayload({ honeypot: "http://spam.example" })),
    );
    expect(response.status).toBe(201);
    expect(sendLeadEventMock).not.toHaveBeenCalled();
  });

  it("sends no Lead event for a submission that was too fast to be human", async () => {
    stubCapiEnv();
    const response = await POST(postRequest(validPayload({ startedAt: Date.now() })));
    expect(response.status).toBe(201);
    expect(sendLeadEventMock).not.toHaveBeenCalled();
  });

  it("sends no Lead event for an invalid submission", async () => {
    stubCapiEnv();
    const response = await POST(postRequest(validPayload({ email: "not-an-email" })));
    expect(response.status).toBe(400);
    expect(sendLeadEventMock).not.toHaveBeenCalled();
  });

  it("sends no Lead event for a duplicate resubmission (idempotent path)", async () => {
    stubCapiEnv();
    await POST(postRequest(validPayload()));
    sendLeadEventMock.mockClear();

    const response = await POST(
      postRequest(validPayload({ goals: "A slightly different goals text." })),
    );
    expect(response.status).toBe(201);
    expect(sendLeadEventMock).not.toHaveBeenCalled();
  });

  it("never affects the response when the CAPI call fails, and logs only a non-sensitive diagnostic", async () => {
    stubCapiEnv();
    sendLeadEventMock.mockResolvedValueOnce({ ok: false, errorCode: "HTTP_400" });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(postRequest(validPayload(), { cookie: "obd_region=other" }));
    expect(response.status).toBe(201);
    const body = (await response.json()) as { ok: boolean };
    expect(body.ok).toBe(true);

    const saved = await Inquiry.findOne({ email: "jordan@acme.com" });
    expect(saved).not.toBeNull();

    const failureLog = errorSpy.mock.calls
      .map(([logged]) => String(logged))
      .find((logged) => logged.includes("agency_lead_capi_failed"));
    expect(failureLog).toBeTruthy();
    const parsed = JSON.parse(failureLog as string) as Record<string, unknown>;
    expect(parsed.event).toBe("agency_lead_capi_failed");
    expect(parsed.errorCode).toBe("HTTP_400");
    expect(typeof parsed.inquiryId).toBe("string");
    expect(failureLog).not.toContain("Jordan Rivera");
    expect(failureLog).not.toContain("jordan@acme.com");
    expect(failureLog).not.toContain("test-capi-token");

    errorSpy.mockRestore();
  });

  it("also never affects the response when the CAPI call throws unexpectedly", async () => {
    stubCapiEnv();
    sendLeadEventMock.mockRejectedValueOnce(new Error("boom"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(postRequest(validPayload(), { cookie: "obd_region=other" }));
    expect(response.status).toBe(201);
    expect(sendLeadEventMock).toHaveBeenCalledTimes(1);
    const body = (await response.json()) as { ok: boolean };
    expect(body.ok).toBe(true);

    const saved = await Inquiry.findOne({ email: "jordan@acme.com" });
    expect(saved).not.toBeNull();

    errorSpy.mockRestore();
  });

  describe("consent gating for UK/EU/EEA visitors", () => {
    it("sends the Lead event for an EEA/UK visitor who already granted consent", async () => {
      stubCapiEnv();
      const response = await POST(
        postRequest(validPayload(), {
          "x-vercel-ip-country": "DE",
          cookie: "obd_region=eea; obd_ad_consent=granted",
        }),
      );
      expect(response.status).toBe(201);
      expect(sendLeadEventMock).toHaveBeenCalledTimes(1);
    });

    it("sends no Lead event for an EEA/UK visitor with no consent decision yet", async () => {
      stubCapiEnv();
      const response = await POST(
        postRequest(validPayload(), { cookie: "obd_region=eea" }),
      );
      expect(response.status).toBe(201);
      expect(sendLeadEventMock).not.toHaveBeenCalled();
    });

    it("sends no Lead event for an EEA/UK visitor who declined", async () => {
      stubCapiEnv();
      const response = await POST(
        postRequest(validPayload(), { cookie: "obd_region=eea; obd_ad_consent=denied" }),
      );
      expect(response.status).toBe(201);
      expect(sendLeadEventMock).not.toHaveBeenCalled();
    });

    it("sends no Lead event when the obd_region cookie is entirely missing — the safe default", async () => {
      stubCapiEnv();
      const response = await POST(postRequest(validPayload()));
      expect(response.status).toBe(201);
      expect(sendLeadEventMock).not.toHaveBeenCalled();
    });

    it("sends the Lead event for a non-EEA/UK visitor even with no consent cookie at all", async () => {
      stubCapiEnv();
      const response = await POST(
        postRequest(validPayload(), { cookie: "obd_region=other" }),
      );
      expect(response.status).toBe(201);
      expect(sendLeadEventMock).toHaveBeenCalledTimes(1);
    });
  });
});
