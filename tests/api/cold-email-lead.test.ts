// Must be the first import — sets MONGODB_URI to an isolated in-memory
// instance before env.ts / mongoose.ts / the route handler are imported.
import { mongod } from "../helpers/mongodb-memory-server";

import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Real Resend is never called in this suite.
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

import { POST as postAgenciesLead } from "@/app/api/agencies-lead/route";
import { POST } from "@/app/api/cold-email-lead/route";
import { connectToDatabase } from "@/lib/mongoose";
import { Inquiry } from "@/lib/models/inquiry";

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Sam Founder",
    email: "sam@somecompany.com",
    website: "somecompany.com",
    teamSize: "2-10",
    need: "more-sales-calls",
    budgetRange: "1k-plus",
    privacyConsent: true,
    honeypot: "",
    startedAt: Date.now() - 5000,
    ...overrides,
  };
}

function postRequest(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const coldEmailRequest = (body: unknown, headers: Record<string, string> = {}) =>
  postRequest("http://localhost:3000/api/cold-email-lead", body, headers);

function stubEmailEnv() {
  vi.stubEnv("RESEND_API_KEY", "test-resend-key");
  vi.stubEnv("RESEND_FROM_EMAIL", "Outbound BD <notifications@updates.outboundbd.com>");
  vi.stubEnv("CONTACT_NOTIFICATION_EMAIL", "hello@outboundbd.com");
}

beforeAll(async () => {
  await connectToDatabase();
});

beforeEach(async () => {
  await Inquiry.deleteMany({});
  sendMock.mockReset();
  sendMock.mockResolvedValue({ data: { id: "email_1" }, error: null });
  sendLeadEventMock.mockReset();
  sendLeadEventMock.mockResolvedValue({ ok: true, eventsReceived: 1 });
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

describe("POST /api/cold-email-lead", () => {
  it("persists a valid lead with source cold-email-landing and its own teamSize field", async () => {
    const response = await POST(coldEmailRequest(validPayload()));
    expect(response.status).toBe(201);

    const saved = await Inquiry.findOne({ email: "sam@somecompany.com" });
    expect(saved?.source).toBe("cold-email-landing");
    expect(saved?.teamSize).toBe("2-10");
    expect(saved?.need).toBe("more-sales-calls");
    expect(saved?.website).toBe("https://somecompany.com");
    expect(saved?.status).toBe("NEW");
    // Team size never lands in the agency form's field.
    expect(saved?.activeClients).toBeUndefined();
    expect(saved?.company).toBeUndefined();
  });

  it("accepts every team size option", async () => {
    for (const [index, teamSize] of ["just-me", "2-10", "11-50", "50-plus"].entries()) {
      const response = await POST(
        coldEmailRequest(validPayload({ teamSize, email: `founder${index}@example.com` }), {
          "x-forwarded-for": `203.0.113.${index + 1}`,
        }),
      );
      expect(response.status).toBe(201);
    }
    expect(await Inquiry.countDocuments({ source: "cold-email-landing" })).toBe(4);
  });

  it("rejects the agency form's fields: no teamSize, or an agency-only need", async () => {
    const withoutTeamSize = validPayload({ activeClients: "6-15" });
    delete (withoutTeamSize as Record<string, unknown>).teamSize;
    const first = await POST(coldEmailRequest(withoutTeamSize));
    expect(first.status).toBe(400);
    const body = (await first.json()) as { fieldErrors?: Record<string, string> };
    expect(body.fieldErrors?.teamSize).toBe("Select your team size");

    const second = await POST(coldEmailRequest(validPayload({ need: "white-label" })));
    expect(second.status).toBe(400);
    expect(await Inquiry.countDocuments({})).toBe(0);
  });

  it("asks for the company website when it's missing", async () => {
    const response = await POST(coldEmailRequest(validPayload({ website: "" })));
    const body = (await response.json()) as { fieldErrors?: Record<string, string> };
    expect(body.fieldErrors?.website).toBe("Enter your company website");
  });

  it("keeps the /agencies route storing agencies-landing, unchanged", async () => {
    const response = await postAgenciesLead(
      postRequest("http://localhost:3000/api/agencies-lead", {
        name: "Alex Agency",
        email: "alex@someagency.com",
        website: "https://someagency.com",
        activeClients: "6-15",
        need: "white-label",
        budgetRange: "1k-plus",
        privacyConsent: true,
        honeypot: "",
        startedAt: Date.now() - 5000,
      }),
    );
    expect(response.status).toBe(201);
    const saved = await Inquiry.findOne({ email: "alex@someagency.com" });
    expect(saved?.source).toBe("agencies-landing");
    expect(saved?.activeClients).toBe("6-15");
    expect(saved?.teamSize).toBeUndefined();
  });

  it("scopes the duplicate window to its own source", async () => {
    await Inquiry.create({
      source: "agencies-landing",
      name: "Sam Founder",
      email: "sam@somecompany.com",
      website: "https://somecompany.com",
      budgetRange: "1k-plus",
      privacyConsent: true,
    });

    await POST(coldEmailRequest(validPayload()));
    await POST(coldEmailRequest(validPayload(), { "x-forwarded-for": "203.0.113.9" }));

    expect(await Inquiry.countDocuments({ source: "cold-email-landing" })).toBe(1);
  });

  it("silently skips a honeypot submission without saving", async () => {
    const response = await POST(coldEmailRequest(validPayload({ honeypot: "bot" })));
    expect(response.status).toBe(201);
    expect(await Inquiry.countDocuments({})).toBe(0);
  });

  it("sends the auto-reply with the business wording, and a cold email notification", async () => {
    stubEmailEnv();
    await POST(coldEmailRequest(validPayload()));

    const payloads = sendMock.mock.calls.map(([payload]) => payload as { to: string; subject: string; text: string });
    const autoReply = payloads.find((payload) => payload.to === "sam@somecompany.com");
    expect(autoReply?.text).toContain("Thanks for reaching out about cold email for your business.");
    expect(autoReply?.text).not.toContain("your agency");

    const notification = payloads.find((payload) => payload.to === "hello@outboundbd.com");
    expect(notification?.subject).toBe("New cold email landing lead - Sam Founder");
    expect(notification?.text).toContain("Source: Cold email landing page");
    expect(notification?.text).toContain("Team size: 2 to 10");
    expect(notification?.text).toContain("What they need: More sales calls for my business");
  });

  it("sends the CAPI Lead event with the shared eventId, only after saving", async () => {
    vi.stubEnv("AGENCY_META_PIXEL_ID", "123456");
    vi.stubEnv("AGENCY_META_CAPI_ACCESS_TOKEN", "test-capi-token");

    await POST(
      coldEmailRequest(validPayload({ eventId: "evt-cold-1" }), { cookie: "obd_region=other" }),
    );

    expect(sendLeadEventMock).toHaveBeenCalledTimes(1);
    expect(sendLeadEventMock.mock.calls[0][0]).toMatchObject({
      eventId: "evt-cold-1",
      email: "sam@somecompany.com",
    });
  });

  it("never sends CAPI for an invalid submission", async () => {
    vi.stubEnv("AGENCY_META_PIXEL_ID", "123456");
    vi.stubEnv("AGENCY_META_CAPI_ACCESS_TOKEN", "test-capi-token");

    await POST(coldEmailRequest(validPayload({ teamSize: "" }), { cookie: "obd_region=other" }));
    expect(sendLeadEventMock).not.toHaveBeenCalled();
  });
});
