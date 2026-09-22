// Must be the first import — sets MONGODB_URI to an isolated in-memory
// instance before env.ts / mongoose.ts / the route handler are imported.
import { mongod } from "../helpers/mongodb-memory-server";

import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Real Resend is never called in this suite. The route calls it twice on a
// successful submission (internal notification, then the prospect
// auto-reply) — both go through this same mock.
const sendMock = vi.hoisted(() => vi.fn());
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

// Real Meta Conversions API is never called in this suite.
const sendLeadEventMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/tracking/capi", () => ({
  sendLeadEvent: sendLeadEventMock,
}));

import { POST } from "@/app/api/agencies-lead/route";
import { connectToDatabase } from "@/lib/mongoose";
import { Inquiry } from "@/lib/models/inquiry";

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Alex Agency",
    email: "alex@someagency.com",
    website: "https://someagency.com",
    activeClients: "6-15",
    need: "white-label",
    budgetRange: "1k-plus",
    privacyConsent: true,
    honeypot: "",
    startedAt: Date.now() - 5000,
    ...overrides,
  };
}

function postRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/agencies-lead", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function stubEmailEnv() {
  vi.stubEnv("RESEND_API_KEY", "test-resend-key");
  vi.stubEnv("RESEND_FROM_EMAIL", "Outbound BD <notifications@updates.outboundbd.com>");
  vi.stubEnv("CONTACT_NOTIFICATION_EMAIL", "hello@outboundbd.com");
}

function stubCapiEnv() {
  vi.stubEnv("AGENCY_META_PIXEL_ID", "123456");
  vi.stubEnv("AGENCY_META_CAPI_ACCESS_TOKEN", "test-capi-token");
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

describe("POST /api/agencies-lead", () => {
  it("persists a valid lead with source: agencies-landing", async () => {
    const response = await POST(postRequest(validPayload()));
    expect(response.status).toBe(201);

    const saved = await Inquiry.findOne({ email: "alex@someagency.com" });
    expect(saved).not.toBeNull();
    expect(saved?.source).toBe("agencies-landing");
    expect(saved?.activeClients).toBe("6-15");
    expect(saved?.need).toBe("white-label");
    expect(saved?.website).toBe("https://someagency.com");
    // Contact-form-only fields are simply absent, never a placeholder.
    expect(saved?.company).toBeUndefined();
    expect(saved?.service).toBeUndefined();
    expect(saved?.goals).toBeUndefined();
  });

  it("stores the client-supplied attribution object", async () => {
    const response = await POST(
      postRequest(
        validPayload({
          attribution: {
            utmSource: "facebook",
            utmMedium: "cpc",
            utmCampaign: "launch",
            fbclid: "abc123",
            landingPath: "/agencies",
          },
        }),
      ),
    );
    expect(response.status).toBe(201);

    const saved = await Inquiry.findOne({ email: "alex@someagency.com" });
    expect(saved?.attribution?.utmSource).toBe("facebook");
    expect(saved?.attribution?.utmMedium).toBe("cpc");
    expect(saved?.attribution?.fbclid).toBe("abc123");
    expect(saved?.attribution?.landingPath).toBe("/agencies");
  });

  it("drops a malformed attribution object rather than failing the submission", async () => {
    const response = await POST(
      postRequest(validPayload({ attribution: { utmCampaign: "x".repeat(1000) } })),
    );
    expect(response.status).toBe(201);
    const saved = await Inquiry.findOne({ email: "alex@someagency.com" });
    expect(saved?.attribution?.utmCampaign).toBeUndefined();
  });

  it("rejects an invalid email and returns field errors, without persisting", async () => {
    const response = await POST(postRequest(validPayload({ email: "not-an-email" })));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { fieldErrors?: Record<string, string> };
    expect(body.fieldErrors?.email).toBeTruthy();
    expect(await Inquiry.countDocuments({})).toBe(0);
  });

  it("rejects a submission missing a required field", async () => {
    const payload = validPayload();
    delete (payload as Record<string, unknown>).activeClients;
    const response = await POST(postRequest(payload));
    expect(response.status).toBe(400);
    expect(await Inquiry.countDocuments({})).toBe(0);
  });

  it("silently discards a honeypot-tripped submission", async () => {
    const response = await POST(postRequest(validPayload({ honeypot: "http://spam.example" })));
    expect(response.status).toBe(201);
    expect(await Inquiry.countDocuments({})).toBe(0);
  });

  it("silently discards a submission that was too fast to be human", async () => {
    const response = await POST(postRequest(validPayload({ startedAt: Date.now() })));
    expect(response.status).toBe(201);
    expect(await Inquiry.countDocuments({})).toBe(0);
  });

  it("treats a same-email resubmission within the window as idempotent", async () => {
    await POST(postRequest(validPayload()));
    const response = await POST(postRequest(validPayload({ activeClients: "50-plus" })));
    expect(response.status).toBe(201);
    expect(await Inquiry.countDocuments({ email: "alex@someagency.com" })).toBe(1);
  });

  it("does not treat a contact-form lead with the same email as a duplicate (source-scoped)", async () => {
    await Inquiry.create({
      source: "contact",
      name: "Alex Agency",
      email: "alex@someagency.com",
      company: "Some Agency",
      website: "https://someagency.com",
      service: "cold-email-outreach",
      targetMarket: "SMBs",
      monthlyOutreachVolume: "under-500",
      budgetRange: "1k-plus",
      goals: "Book more calls",
      privacyConsent: true,
      status: "NEW",
    });

    const response = await POST(postRequest(validPayload()));
    expect(response.status).toBe(201);
    expect(await Inquiry.countDocuments({ email: "alex@someagency.com" })).toBe(2);
  });

  it("rate-limits after 3 submissions from the same IP within the window, shared with /api/inquiries's own counter", async () => {
    const headers = { "x-forwarded-for": "203.0.113.77" };
    await POST(postRequest(validPayload({ email: "a@agency.com" }), headers));
    await POST(postRequest(validPayload({ email: "b@agency.com" }), headers));
    await POST(postRequest(validPayload({ email: "c@agency.com" }), headers));

    const response = await POST(postRequest(validPayload({ email: "d@agency.com" }), headers));
    expect(response.status).toBe(429);
    expect(await Inquiry.countDocuments({})).toBe(3);
  });

  it("returns a friendly JSON 500 and logs a non-sensitive diagnostic when MongoDB persistence fails", async () => {
    const createSpy = vi.spyOn(Inquiry, "create").mockRejectedValueOnce(new Error("connection lost"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(postRequest(validPayload()));
    expect(response.status).toBe(500);
    const body = (await response.json()) as { ok: boolean; message: string };
    expect(body.ok).toBe(false);
    expect(body.message).toBeTruthy();

    const failureLog = errorSpy.mock.calls
      .map(([logged]) => String(logged))
      .find((logged) => logged.includes("inquiry_persist_failed"));
    expect(failureLog).toBeTruthy();
    expect(failureLog).not.toContain("connection lost");
    expect(failureLog).not.toContain("alex@someagency.com");

    createSpy.mockRestore();
    errorSpy.mockRestore();
  });
});

describe("POST /api/agencies-lead — internal notification and auto-reply", () => {
  it("sends exactly one internal notification and one auto-reply, both after persistence, on a successful submission", async () => {
    stubEmailEnv();
    let sawPersistedDocWhenSending = false;
    sendMock.mockImplementation(async () => {
      const saved = await Inquiry.findOne({ email: "alex@someagency.com" });
      sawPersistedDocWhenSending = saved !== null;
      return { data: { id: "email_1" }, error: null };
    });

    const response = await POST(postRequest(validPayload()));
    expect(response.status).toBe(201);
    expect(sawPersistedDocWhenSending).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(2);

    const [notificationPayload] = sendMock.mock.calls[0];
    expect(notificationPayload.to).toBe("hello@outboundbd.com");
    expect(notificationPayload.subject).toContain("agencies landing");

    const [autoReplyPayload] = sendMock.mock.calls[1];
    expect(autoReplyPayload.to).toBe("alex@someagency.com");
    expect(autoReplyPayload.subject).toBe("Got your details, Alex");
  });

  it("sends neither email for an invalid submission", async () => {
    stubEmailEnv();
    const response = await POST(postRequest(validPayload({ email: "not-an-email" })));
    expect(response.status).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("still returns success, with the lead persisted, when the auto-reply fails", async () => {
    stubEmailEnv();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    sendMock
      .mockResolvedValueOnce({ data: { id: "notif_1" }, error: null }) // internal notification succeeds
      .mockRejectedValueOnce(new Error("network down")); // auto-reply fails

    const response = await POST(postRequest(validPayload()));
    expect(response.status).toBe(201);
    const body = (await response.json()) as { ok: boolean };
    expect(body.ok).toBe(true);

    const saved = await Inquiry.findOne({ email: "alex@someagency.com" });
    expect(saved).not.toBeNull();

    const failureLog = errorSpy.mock.calls
      .map(([logged]) => String(logged))
      .find((logged) => logged.includes("agency_auto_reply_failed"));
    expect(failureLog).toBeTruthy();
    expect(failureLog).not.toContain("alex@someagency.com");
    expect(failureLog).not.toContain("Alex Agency");

    errorSpy.mockRestore();
  });

  it("persists successfully and reports success when email configuration is entirely missing", async () => {
    const response = await POST(postRequest(validPayload()));
    expect(response.status).toBe(201);
    expect(sendMock).not.toHaveBeenCalled();
    expect(await Inquiry.findOne({ email: "alex@someagency.com" })).not.toBeNull();
  });
});

describe("POST /api/agencies-lead — agency Meta CAPI Lead event", () => {
  it("sends exactly one Lead event for a valid non-EEA/UK submission", async () => {
    stubCapiEnv();
    const response = await POST(
      postRequest(validPayload({ eventId: "evt-abc" }), { cookie: "obd_region=other" }),
    );
    expect(response.status).toBe(201);
    expect(sendLeadEventMock).toHaveBeenCalledTimes(1);
    const [input] = sendLeadEventMock.mock.calls[0];
    expect(input.eventId).toBe("evt-abc");
    expect(input.email).toBe("alex@someagency.com");
  });

  it("sends no Lead event for a honeypot-tripped submission", async () => {
    stubCapiEnv();
    const response = await POST(
      postRequest(validPayload({ honeypot: "http://spam.example" }), { cookie: "obd_region=other" }),
    );
    expect(response.status).toBe(201);
    expect(sendLeadEventMock).not.toHaveBeenCalled();
  });

  it("sends no Lead event for a duplicate resubmission", async () => {
    stubCapiEnv();
    await POST(postRequest(validPayload(), { cookie: "obd_region=other" }));
    sendLeadEventMock.mockClear();

    const response = await POST(
      postRequest(validPayload({ activeClients: "50-plus" }), { cookie: "obd_region=other" }),
    );
    expect(response.status).toBe(201);
    expect(sendLeadEventMock).not.toHaveBeenCalled();
  });

  it("sends no Lead event for an EEA/UK visitor with no consent decision yet", async () => {
    stubCapiEnv();
    const response = await POST(postRequest(validPayload(), { cookie: "obd_region=eea" }));
    expect(response.status).toBe(201);
    expect(sendLeadEventMock).not.toHaveBeenCalled();
  });

  it("sends the Lead event for an EEA/UK visitor who already granted consent", async () => {
    stubCapiEnv();
    const response = await POST(
      postRequest(validPayload(), { cookie: "obd_region=eea; obd_ad_consent=granted" }),
    );
    expect(response.status).toBe(201);
    expect(sendLeadEventMock).toHaveBeenCalledTimes(1);
  });

  it("never affects the response when the CAPI call fails", async () => {
    stubCapiEnv();
    sendLeadEventMock.mockResolvedValueOnce({ ok: false, errorCode: "HTTP_400" });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(postRequest(validPayload(), { cookie: "obd_region=other" }));
    expect(response.status).toBe(201);

    errorSpy.mockRestore();
  });
});
