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
import { Payment } from "@/lib/models/payment";
import { RATE_LIMIT_COLLECTION } from "@/lib/masterclass/rate-limit";
import { createPaymentAction, deletePaymentAction, updatePaymentAction } from "@/app/admin/payments/actions";
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

function validPaymentFormData(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData();
  const fields: Record<string, string> = {
    amountCents: "499.00",
    paidAt: "2026-09-15",
    method: "WISE",
    type: "MONTHLY",
    ...overrides,
  };
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

async function createTestClient() {
  return Client.create({
    name: "Alex Founder",
    company: "Acme Inc",
    email: "alex@acme.com",
    website: "https://acme.com",
    plan: "LAUNCH",
    monthlyAmountCents: 49900,
    currency: "USD",
    billingDayOfMonth: 1,
    startDate: new Date("2026-09-01"),
    status: "ACTIVE",
  });
}

beforeAll(async () => {
  await connectToDatabase();
});

beforeEach(async () => {
  const connection = await connectToDatabase();
  await Promise.all([
    Client.deleteMany({}),
    Payment.deleteMany({}),
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

describe("createPaymentAction", () => {
  it("creates a payment and converts the dollars input to exact cents", async () => {
    const client = await createTestClient();
    mockRequestHeaders();
    const result = await createPaymentAction(String(client._id), { ok: true, message: "" }, validPaymentFormData());

    expect(result.ok).toBe(true);
    const payments = await Payment.find({ clientId: client._id });
    expect(payments).toHaveLength(1);
    expect(payments[0].amountCents).toBe(49900);
  });

  it("rejects an unauthorized request and never creates a payment", async () => {
    const client = await createTestClient();
    mockRequestHeaders({ authorization: null });
    const result = await createPaymentAction(String(client._id), { ok: true, message: "" }, validPaymentFormData());

    expect(result).toEqual({ ok: false, message: NOT_AUTHORIZED_MESSAGE });
    expect(await Payment.countDocuments({})).toBe(0);
  });

  it("rejects a mismatched origin and never creates a payment", async () => {
    const client = await createTestClient();
    mockRequestHeaders({ origin: "https://evil.example.com" });
    const result = await createPaymentAction(String(client._id), { ok: true, message: "" }, validPaymentFormData());

    expect(result).toEqual({ ok: false, message: ORIGIN_REJECTED_MESSAGE });
    expect(await Payment.countDocuments({})).toBe(0);
  });

  it("rejects a zero or negative amount", async () => {
    const client = await createTestClient();
    mockRequestHeaders();
    const result = await createPaymentAction(
      String(client._id),
      { ok: true, message: "" },
      validPaymentFormData({ amountCents: "0" }),
    );
    expect(result.ok).toBe(false);
    expect(await Payment.countDocuments({})).toBe(0);
  });
});

describe("updatePaymentAction", () => {
  it("edits an existing payment for an authorized request", async () => {
    const client = await createTestClient();
    mockRequestHeaders();
    await createPaymentAction(String(client._id), { ok: true, message: "" }, validPaymentFormData());
    const [payment] = await Payment.find({ clientId: client._id });

    const result = await updatePaymentAction(
      String(payment._id),
      { ok: true, message: "" },
      validPaymentFormData({ amountCents: "150.00", method: "STRIPE" }),
    );
    expect(result.ok).toBe(true);

    const updated = await Payment.findById(payment._id);
    expect(updated?.amountCents).toBe(15000);
    expect(updated?.method).toBe("STRIPE");
  });

  it("rejects an unauthorized request and never mutates the document", async () => {
    const client = await createTestClient();
    mockRequestHeaders();
    await createPaymentAction(String(client._id), { ok: true, message: "" }, validPaymentFormData());
    const [payment] = await Payment.find({ clientId: client._id });

    mockRequestHeaders({ authorization: null });
    const result = await updatePaymentAction(
      String(payment._id),
      { ok: true, message: "" },
      validPaymentFormData({ amountCents: "999.00" }),
    );

    expect(result).toEqual({ ok: false, message: NOT_AUTHORIZED_MESSAGE });
    const unchanged = await Payment.findById(payment._id);
    expect(unchanged?.amountCents).toBe(49900);
  });

  it("returns not-found for a nonexistent payment", async () => {
    mockRequestHeaders();
    const result = await updatePaymentAction(
      new mongoose.Types.ObjectId().toString(),
      { ok: true, message: "" },
      validPaymentFormData(),
    );
    expect(result.ok).toBe(false);
  });
});

describe("deletePaymentAction", () => {
  it("deletes a payment for an authorized request", async () => {
    const client = await createTestClient();
    mockRequestHeaders();
    await createPaymentAction(String(client._id), { ok: true, message: "" }, validPaymentFormData());
    const [payment] = await Payment.find({ clientId: client._id });

    const result = await deletePaymentAction(String(payment._id), { ok: true, message: "" }, new FormData());
    expect(result.ok).toBe(true);
    expect(await Payment.findById(payment._id)).toBeNull();
  });

  it("rejects an unauthorized request and never deletes the document", async () => {
    const client = await createTestClient();
    mockRequestHeaders();
    await createPaymentAction(String(client._id), { ok: true, message: "" }, validPaymentFormData());
    const [payment] = await Payment.find({ clientId: client._id });

    mockRequestHeaders({ authorization: null });
    const result = await deletePaymentAction(String(payment._id), { ok: true, message: "" }, new FormData());

    expect(result).toEqual({ ok: false, message: NOT_AUTHORIZED_MESSAGE });
    expect(await Payment.findById(payment._id)).not.toBeNull();
  });

  it("rejects a mismatched origin and never deletes the document", async () => {
    const client = await createTestClient();
    mockRequestHeaders();
    await createPaymentAction(String(client._id), { ok: true, message: "" }, validPaymentFormData());
    const [payment] = await Payment.find({ clientId: client._id });

    mockRequestHeaders({ origin: "https://evil.example.com" });
    const result = await deletePaymentAction(String(payment._id), { ok: true, message: "" }, new FormData());

    expect(result).toEqual({ ok: false, message: ORIGIN_REJECTED_MESSAGE });
    expect(await Payment.findById(payment._id)).not.toBeNull();
  });

  it("returns not-found for a nonexistent payment", async () => {
    mockRequestHeaders();
    const result = await deletePaymentAction(new mongoose.Types.ObjectId().toString(), { ok: true, message: "" }, new FormData());
    expect(result.ok).toBe(false);
  });
});
