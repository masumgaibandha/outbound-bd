// Must be the first import — sets MONGODB_URI (and NEXT_PUBLIC_APP_URL) to
// an isolated in-memory instance before env.ts / mongoose.ts / admin-auth.ts
// / actions.ts are imported.
import { mongod } from "../helpers/mongodb-memory-server";

import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const headersMock = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({ headers: headersMock }));

// `revalidatePath` requires a live Next.js request-handling store that
// doesn't exist when a Server Action is invoked directly from a test.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { connectToDatabase } from "@/lib/mongoose";
import { Inquiry } from "@/lib/models/inquiry";
import { RATE_LIMIT_COLLECTION } from "@/lib/masterclass/rate-limit";
import { changeStatusAction, addNoteAction } from "@/app/admin/leads/actions";
import { NOT_AUTHORIZED_MESSAGE, ORIGIN_REJECTED_MESSAGE } from "@/lib/agency-admin/messages";

const ADMIN_USER = "qa-agency-admin";
const ADMIN_PASSWORD = "qa-correct-horse-battery-staple";
// The forwarded host/proto stand in for whatever Vercel sets per deployment
// (Production, or any ephemeral Preview URL) — the action derives its
// expected origin from these, never from a fixed configured URL. See
// src/lib/agency-admin/origin.ts.
const FORWARDED_HOST = "outbound-preview-abc123.vercel.app";
const MATCHING_ORIGIN = `https://${FORWARDED_HOST}`;

function basicAuthHeader(user: string, password: string): string {
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

function mockRequestHeaders(
  opts: {
    authorization?: string | null;
    origin?: string | null;
    secFetchSite?: string | null;
    forwardedHost?: string | null;
    forwardedProto?: string | null;
    ip?: string;
  } = {},
) {
  const {
    authorization = basicAuthHeader(ADMIN_USER, ADMIN_PASSWORD),
    origin = MATCHING_ORIGIN,
    secFetchSite = "same-origin",
    forwardedHost = FORWARDED_HOST,
    forwardedProto = "https",
    ip = "203.0.113.9",
  } = opts;
  const map = new Map<string, string>();
  if (authorization !== null) map.set("authorization", authorization);
  if (origin !== null) map.set("origin", origin);
  if (secFetchSite !== null) map.set("sec-fetch-site", secFetchSite);
  if (forwardedHost !== null) map.set("x-forwarded-host", forwardedHost);
  if (forwardedProto !== null) map.set("x-forwarded-proto", forwardedProto);
  map.set("x-forwarded-for", ip);
  headersMock.mockResolvedValue({ get: (key: string) => map.get(key.toLowerCase()) ?? null });
}

async function createLead(overrides: Partial<Record<string, unknown>> = {}) {
  return Inquiry.create({
    source: "contact",
    name: "Test Lead",
    email: "lead@example.com",
    website: "https://acme.example.com",
    budgetRange: "1k-plus",
    privacyConsent: true,
    status: "NEW",
    ...overrides,
  });
}

beforeAll(async () => {
  await connectToDatabase();
});

beforeEach(async () => {
  const connection = await connectToDatabase();
  await Promise.all([
    Inquiry.deleteMany({}),
    connection.connection.db?.collection(RATE_LIMIT_COLLECTION).deleteMany({}),
  ]);

  vi.unstubAllEnvs();
  vi.stubEnv("AGENCY_ADMIN_USER", ADMIN_USER);
  vi.stubEnv("AGENCY_ADMIN_PASSWORD", ADMIN_PASSWORD);
  vi.stubEnv("AGENCY_ADMIN_RATE_LIMIT_SECRET", "qa-agency-rate-limit-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
  headersMock.mockReset();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("changeStatusAction", () => {
  it("updates status and appends a statusHistory entry for an authorized request", async () => {
    const lead = await createLead();
    mockRequestHeaders();

    const formData = new FormData();
    formData.set("status", "CONTACTED");
    const result = await changeStatusAction(String(lead._id), { ok: true, message: "" }, formData);

    expect(result.ok).toBe(true);
    const fresh = await Inquiry.findById(lead._id);
    expect(fresh?.status).toBe("CONTACTED");
    expect(fresh?.statusHistory).toHaveLength(1);
  });

  it("rejects an unauthorized request and never mutates the document", async () => {
    const lead = await createLead();
    mockRequestHeaders({ authorization: null });

    const formData = new FormData();
    formData.set("status", "CONTACTED");
    const result = await changeStatusAction(String(lead._id), { ok: true, message: "" }, formData);

    expect(result.ok).toBe(false);
    const fresh = await Inquiry.findById(lead._id);
    expect(fresh?.status).toBe("NEW");
  });

  it("succeeds when Origin matches the forwarded host (Preview or Production alike)", async () => {
    const lead = await createLead();
    mockRequestHeaders({ forwardedHost: "outboundbd.com", origin: "https://outboundbd.com" });

    const formData = new FormData();
    formData.set("status", "CONTACTED");
    const result = await changeStatusAction(String(lead._id), { ok: true, message: "" }, formData);

    expect(result.ok).toBe(true);
  });

  it("rejects a cross-origin request even with correct credentials, with a distinct message from an auth failure", async () => {
    const lead = await createLead();
    mockRequestHeaders({ origin: "https://evil.example.com" });

    const formData = new FormData();
    formData.set("status", "CONTACTED");
    const result = await changeStatusAction(String(lead._id), { ok: true, message: "" }, formData);

    expect(result).toEqual({ ok: false, message: ORIGIN_REJECTED_MESSAGE });
    expect(result.message).not.toBe(NOT_AUTHORIZED_MESSAGE);
    const fresh = await Inquiry.findById(lead._id);
    expect(fresh?.status).toBe("NEW");
  });

  it("rejects when the Origin header is missing entirely, even with correct credentials and a matching forwarded host", async () => {
    const lead = await createLead();
    mockRequestHeaders({ origin: null });

    const formData = new FormData();
    formData.set("status", "CONTACTED");
    const result = await changeStatusAction(String(lead._id), { ok: true, message: "" }, formData);

    expect(result).toEqual({ ok: false, message: ORIGIN_REJECTED_MESSAGE });
    const fresh = await Inquiry.findById(lead._id);
    expect(fresh?.status).toBe("NEW");
  });

  it("rejects on auth failure with the auth message, even when the origin would otherwise match", async () => {
    const lead = await createLead();
    mockRequestHeaders({ authorization: null });

    const formData = new FormData();
    formData.set("status", "CONTACTED");
    const result = await changeStatusAction(String(lead._id), { ok: true, message: "" }, formData);

    expect(result).toEqual({ ok: false, message: NOT_AUTHORIZED_MESSAGE });
  });

  it("rejects on auth failure even when the origin is ALSO mismatched — the auth message wins, never the origin one", async () => {
    const lead = await createLead();
    mockRequestHeaders({ authorization: null, origin: "https://evil.example.com" });

    const formData = new FormData();
    formData.set("status", "CONTACTED");
    const result = await changeStatusAction(String(lead._id), { ok: true, message: "" }, formData);

    expect(result).toEqual({ ok: false, message: NOT_AUTHORIZED_MESSAGE });
    const fresh = await Inquiry.findById(lead._id);
    expect(fresh?.status).toBe("NEW");
  });

  it("rejects an invalid status value", async () => {
    const lead = await createLead();
    mockRequestHeaders();

    const formData = new FormData();
    formData.set("status", "NOT_A_REAL_STATUS");
    const result = await changeStatusAction(String(lead._id), { ok: true, message: "" }, formData);

    expect(result.ok).toBe(false);
    const fresh = await Inquiry.findById(lead._id);
    expect(fresh?.status).toBe("NEW");
  });

  it("returns not-found for a nonexistent lead id", async () => {
    mockRequestHeaders();
    const formData = new FormData();
    formData.set("status", "CONTACTED");
    const result = await changeStatusAction(new mongoose.Types.ObjectId().toString(), { ok: true, message: "" }, formData);
    expect(result.ok).toBe(false);
  });
});

describe("addNoteAction", () => {
  it("appends a note for an authorized request", async () => {
    const lead = await createLead();
    mockRequestHeaders();

    const formData = new FormData();
    formData.set("text", "Called, left voicemail.");
    const result = await addNoteAction(String(lead._id), { ok: true, message: "" }, formData);

    expect(result.ok).toBe(true);
    const fresh = await Inquiry.findById(lead._id);
    expect(fresh?.notes).toHaveLength(1);
    expect(fresh?.notes[0].text).toBe("Called, left voicemail.");
  });

  it("rejects an empty note", async () => {
    const lead = await createLead();
    mockRequestHeaders();

    const formData = new FormData();
    formData.set("text", "   ");
    const result = await addNoteAction(String(lead._id), { ok: true, message: "" }, formData);

    expect(result.ok).toBe(false);
    const fresh = await Inquiry.findById(lead._id);
    expect(fresh?.notes).toHaveLength(0);
  });

  it("rejects an unauthorized request and never mutates the document", async () => {
    const lead = await createLead();
    mockRequestHeaders({ authorization: null });

    const formData = new FormData();
    formData.set("text", "Should not be saved.");
    const result = await addNoteAction(String(lead._id), { ok: true, message: "" }, formData);

    expect(result).toEqual({ ok: false, message: NOT_AUTHORIZED_MESSAGE });
    const fresh = await Inquiry.findById(lead._id);
    expect(fresh?.notes).toHaveLength(0);
  });

  it("succeeds when Origin matches the forwarded host", async () => {
    const lead = await createLead();
    mockRequestHeaders({ forwardedHost: "outboundbd.com", origin: "https://outboundbd.com" });

    const formData = new FormData();
    formData.set("text", "Left voicemail.");
    const result = await addNoteAction(String(lead._id), { ok: true, message: "" }, formData);

    expect(result.ok).toBe(true);
  });

  it("rejects a mismatched origin with a distinct message from an auth failure, and never mutates the document", async () => {
    const lead = await createLead();
    mockRequestHeaders({ origin: "https://evil.example.com" });

    const formData = new FormData();
    formData.set("text", "Should not be saved.");
    const result = await addNoteAction(String(lead._id), { ok: true, message: "" }, formData);

    expect(result).toEqual({ ok: false, message: ORIGIN_REJECTED_MESSAGE });
    const fresh = await Inquiry.findById(lead._id);
    expect(fresh?.notes).toHaveLength(0);
  });

  it("rejects when the Origin header is missing entirely, even with correct credentials", async () => {
    const lead = await createLead();
    mockRequestHeaders({ origin: null });

    const formData = new FormData();
    formData.set("text", "Should not be saved.");
    const result = await addNoteAction(String(lead._id), { ok: true, message: "" }, formData);

    expect(result).toEqual({ ok: false, message: ORIGIN_REJECTED_MESSAGE });
    const fresh = await Inquiry.findById(lead._id);
    expect(fresh?.notes).toHaveLength(0);
  });
});
