// Must be the first import — sets MONGODB_URI (and NEXT_PUBLIC_APP_URL) to
// an isolated in-memory instance before env.ts / mongoose.ts / admin-auth.ts
// / actions.ts are imported.
import { mongod } from "../helpers/mongodb-memory-server";

import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const headersMock = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({ headers: headersMock }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { connectToDatabase } from "@/lib/mongoose";
import { Client } from "@/lib/models/client";
import { Inquiry } from "@/lib/models/inquiry";
import { RATE_LIMIT_COLLECTION } from "@/lib/masterclass/rate-limit";
import { addClientNoteAction, createClientAction, updateClientAction } from "@/app/admin/clients/actions";
import { NOT_AUTHORIZED_MESSAGE, ORIGIN_REJECTED_MESSAGE } from "@/lib/agency-admin/messages";

const ADMIN_USER = "qa-agency-admin";
const ADMIN_PASSWORD = "qa-correct-horse-battery-staple";
const FORWARDED_HOST = "outbound-preview-abc123.vercel.app";
const MATCHING_ORIGIN = `https://${FORWARDED_HOST}`;

function basicAuthHeader(user: string, password: string): string {
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

function mockRequestHeaders(
  opts: { authorization?: string | null; origin?: string | null; ip?: string } = {},
) {
  const {
    authorization = basicAuthHeader(ADMIN_USER, ADMIN_PASSWORD),
    origin = MATCHING_ORIGIN,
    ip = "203.0.113.9",
  } = opts;
  const map = new Map<string, string>();
  if (authorization !== null) map.set("authorization", authorization);
  if (origin !== null) map.set("origin", origin);
  map.set("sec-fetch-site", "same-origin");
  map.set("x-forwarded-host", FORWARDED_HOST);
  map.set("x-forwarded-proto", "https");
  map.set("x-forwarded-for", ip);
  headersMock.mockResolvedValue({ get: (key: string) => map.get(key.toLowerCase()) ?? null });
}

function validClientFormData(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData();
  const fields: Record<string, string> = {
    name: "Alex Founder",
    company: "Acme Inc",
    email: "alex@acme.com",
    website: "https://acme.com",
    plan: "LAUNCH",
    monthlyAmountCents: "499.00",
    billingDayOfMonth: "1",
    startDate: "2026-09-01",
    ...overrides,
  };
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

async function createWonLead() {
  return Inquiry.create({
    source: "contact",
    name: "Lead Name",
    email: "lead@example.com",
    website: "https://lead.example.com",
    budgetRange: "1k-plus",
    privacyConsent: true,
    status: "WON",
  });
}

beforeAll(async () => {
  await connectToDatabase();
});

beforeEach(async () => {
  const connection = await connectToDatabase();
  await Promise.all([
    Client.deleteMany({}),
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

describe("createClientAction", () => {
  it("creates a standalone client (sourceInquiryId null) and converts the dollars input to exact cents", async () => {
    mockRequestHeaders();
    const result = await createClientAction(null, { ok: true, message: "" }, validClientFormData());

    expect(result.ok).toBe(true);
    expect(result.clientId).toBeDefined();
    const created = await Client.findById(result.clientId);
    expect(created?.monthlyAmountCents).toBe(49900);
    expect(created?.sourceInquiryId).toBeUndefined();
  });

  it("creates a client linked to a WON lead", async () => {
    const lead = await createWonLead();
    mockRequestHeaders();
    const result = await createClientAction(String(lead._id), { ok: true, message: "" }, validClientFormData());

    expect(result.ok).toBe(true);
    const created = await Client.findById(result.clientId);
    expect(String(created?.sourceInquiryId)).toBe(String(lead._id));
  });

  it("never creates a duplicate for the same lead: a second call returns the existing client", async () => {
    const lead = await createWonLead();
    mockRequestHeaders();
    const first = await createClientAction(
      String(lead._id),
      { ok: true, message: "" },
      validClientFormData({ company: "First Co" }),
    );
    const second = await createClientAction(
      String(lead._id),
      { ok: true, message: "" },
      validClientFormData({ company: "Second Co" }),
    );

    expect(second.ok).toBe(true);
    expect(second.alreadyExisted).toBe(true);
    expect(second.clientId).toBe(first.clientId);

    const count = await Client.countDocuments({ sourceInquiryId: lead._id });
    expect(count).toBe(1);
  });

  it("rejects an unauthorized request and never creates a client", async () => {
    mockRequestHeaders({ authorization: null });
    const result = await createClientAction(null, { ok: true, message: "" }, validClientFormData());

    expect(result).toEqual({ ok: false, message: NOT_AUTHORIZED_MESSAGE });
    expect(await Client.countDocuments({})).toBe(0);
  });

  it("rejects a mismatched origin and never creates a client", async () => {
    mockRequestHeaders({ origin: "https://evil.example.com" });
    const result = await createClientAction(null, { ok: true, message: "" }, validClientFormData());

    expect(result).toEqual({ ok: false, message: ORIGIN_REJECTED_MESSAGE });
    expect(await Client.countDocuments({})).toBe(0);
  });

  it("rejects an invalid amount (a non-integer-cents dollars string) and never creates a client", async () => {
    mockRequestHeaders();
    const result = await createClientAction(
      null,
      { ok: true, message: "" },
      validClientFormData({ monthlyAmountCents: "not-a-number" }),
    );

    expect(result.ok).toBe(false);
    expect(await Client.countDocuments({})).toBe(0);
  });

  it("rejects a billing day outside 1 to 28", async () => {
    mockRequestHeaders();
    const result = await createClientAction(
      null,
      { ok: true, message: "" },
      validClientFormData({ billingDayOfMonth: "31" }),
    );
    expect(result.ok).toBe(false);
  });
});

describe("updateClientAction", () => {
  it("updates a client for an authorized request", async () => {
    mockRequestHeaders();
    const created = await createClientAction(null, { ok: true, message: "" }, validClientFormData());
    const formData = validClientFormData({ company: "Renamed Co", monthlyAmountCents: "999.00" });
    formData.set("status", "PAUSED");

    const result = await updateClientAction(created.clientId!, { ok: true, message: "" }, formData);
    expect(result.ok).toBe(true);

    const updated = await Client.findById(created.clientId);
    expect(updated?.company).toBe("Renamed Co");
    expect(updated?.monthlyAmountCents).toBe(99900);
    expect(updated?.status).toBe("PAUSED");
  });

  it("rejects an unauthorized request and never mutates the document", async () => {
    mockRequestHeaders();
    const created = await createClientAction(null, { ok: true, message: "" }, validClientFormData());

    mockRequestHeaders({ authorization: null });
    const formData = validClientFormData({ company: "Should not apply" });
    formData.set("status", "ACTIVE");
    const result = await updateClientAction(created.clientId!, { ok: true, message: "" }, formData);

    expect(result).toEqual({ ok: false, message: NOT_AUTHORIZED_MESSAGE });
    const unchanged = await Client.findById(created.clientId);
    expect(unchanged?.company).toBe("Acme Inc");
  });
});

describe("addClientNoteAction", () => {
  it("appends a note for an authorized request", async () => {
    mockRequestHeaders();
    const created = await createClientAction(null, { ok: true, message: "" }, validClientFormData());

    const formData = new FormData();
    formData.set("text", "Kickoff scheduled.");
    const result = await addClientNoteAction(created.clientId!, { ok: true, message: "" }, formData);

    expect(result.ok).toBe(true);
    const updated = await Client.findById(created.clientId);
    expect(updated?.notes).toHaveLength(1);
  });

  it("rejects an unauthorized request and never mutates the document", async () => {
    mockRequestHeaders();
    const created = await createClientAction(null, { ok: true, message: "" }, validClientFormData());

    mockRequestHeaders({ authorization: null });
    const formData = new FormData();
    formData.set("text", "Should not be saved.");
    const result = await addClientNoteAction(created.clientId!, { ok: true, message: "" }, formData);

    expect(result).toEqual({ ok: false, message: NOT_AUTHORIZED_MESSAGE });
    const unchanged = await Client.findById(created.clientId);
    expect(unchanged?.notes).toHaveLength(0);
  });
});
