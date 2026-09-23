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

const ADMIN_USER = "qa-agency-admin";
const ADMIN_PASSWORD = "qa-correct-horse-battery-staple";
const ALLOWED_ORIGIN = "http://localhost:3000"; // matches the test helper's NEXT_PUBLIC_APP_URL default

function basicAuthHeader(user: string, password: string): string {
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

function mockRequestHeaders(
  opts: {
    authorization?: string | null;
    origin?: string | null;
    secFetchSite?: string | null;
    ip?: string;
  } = {},
) {
  const {
    authorization = basicAuthHeader(ADMIN_USER, ADMIN_PASSWORD),
    origin = ALLOWED_ORIGIN,
    secFetchSite = "same-origin",
    ip = "203.0.113.9",
  } = opts;
  const map = new Map<string, string>();
  if (authorization !== null) map.set("authorization", authorization);
  if (origin !== null) map.set("origin", origin);
  if (secFetchSite !== null) map.set("sec-fetch-site", secFetchSite);
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

  it("rejects a cross-origin request even with correct credentials", async () => {
    const lead = await createLead();
    mockRequestHeaders({ origin: "https://evil.example.com" });

    const formData = new FormData();
    formData.set("status", "CONTACTED");
    const result = await changeStatusAction(String(lead._id), { ok: true, message: "" }, formData);

    expect(result.ok).toBe(false);
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

    expect(result.ok).toBe(false);
    const fresh = await Inquiry.findById(lead._id);
    expect(fresh?.notes).toHaveLength(0);
  });
});
