// Must be the first import — sets MONGODB_URI to an isolated in-memory
// instance before env.ts / mongoose.ts / the route handler are imported.
import { mongod } from "../helpers/mongodb-memory-server";

import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

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
    budgetRange: "5k-10k",
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
});

afterEach(async () => {
  await Inquiry.deleteMany({});
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
