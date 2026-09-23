// Must be the first import — sets MONGODB_URI to an isolated in-memory
// instance before mongoose.ts / the model / the repository are imported.
import { mongod } from "../helpers/mongodb-memory-server";

import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { connectToDatabase } from "@/lib/mongoose";
import { Client } from "@/lib/models/client";
import { Payment } from "@/lib/models/payment";
import {
  createPayment,
  deletePayment,
  findPaymentById,
  getMonthlyCollectedSeries,
  getRevenueByType,
  listAllFilteredPayments,
  listPaymentsForClient,
  listPaymentsPage,
  updatePayment,
} from "@/lib/agency-admin/payments-repository";
import type { CreatePaymentInput } from "@/lib/agency-admin/payments-validation";

beforeAll(async () => {
  await connectToDatabase();
});

afterEach(async () => {
  await Promise.all([Payment.deleteMany({}), Client.deleteMany({})]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

async function createTestClient(overrides: Partial<Record<string, unknown>> = {}) {
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
    ...overrides,
  });
}

function validPaymentInput(overrides: Partial<CreatePaymentInput> = {}): CreatePaymentInput {
  return {
    amountCents: 49900,
    paidAt: "2026-09-15",
    method: "WISE",
    type: "MONTHLY",
    ...overrides,
  };
}

describe("createPayment / findPaymentById", () => {
  it("creates and finds a payment", async () => {
    const client = await createTestClient();
    const created = await createPayment(String(client._id), validPaymentInput());
    const found = await findPaymentById(created.id);
    expect(found?.amountCents).toBe(49900);
    expect(found?.method).toBe("WISE");
  });

  it("returns null for a nonexistent payment", async () => {
    expect(await findPaymentById(new mongoose.Types.ObjectId().toString())).toBeNull();
  });
});

describe("updatePayment", () => {
  it("updates every field, including clearing optional reference/note", async () => {
    const client = await createTestClient();
    const created = await createPayment(
      String(client._id),
      validPaymentInput({ reference: "INV-1", note: "first note" }),
    );

    const updated = await updatePayment(created.id, validPaymentInput({ amountCents: 10000 }));
    expect(updated?.amountCents).toBe(10000);
    expect(updated?.reference).toBeUndefined();
    expect(updated?.note).toBeUndefined();
  });

  it("returns null for a nonexistent payment", async () => {
    const result = await updatePayment(new mongoose.Types.ObjectId().toString(), validPaymentInput());
    expect(result).toBeNull();
  });
});

describe("deletePayment", () => {
  it("deletes an existing payment and returns true", async () => {
    const client = await createTestClient();
    const created = await createPayment(String(client._id), validPaymentInput());
    const deleted = await deletePayment(created.id);
    expect(deleted).toBe(true);
    expect(await findPaymentById(created.id)).toBeNull();
  });

  it("returns false for a nonexistent payment", async () => {
    expect(await deletePayment(new mongoose.Types.ObjectId().toString())).toBe(false);
  });
});

describe("listPaymentsPage / listAllFilteredPayments / listPaymentsForClient", () => {
  it("filters by date range (Asia/Dhaka), clientId, method, and type, newest first", async () => {
    const clientA = await createTestClient({ email: "a@example.com", company: "A Co" });
    const clientB = await createTestClient({ email: "b@example.com", company: "B Co" });

    await createPayment(String(clientA._id), validPaymentInput({ paidAt: "2026-09-01", method: "WISE", type: "MONTHLY" }));
    await createPayment(String(clientA._id), validPaymentInput({ paidAt: "2026-09-05", method: "STRIPE", type: "SETUP" }));
    await createPayment(String(clientB._id), validPaymentInput({ paidAt: "2026-09-10", method: "WISE", type: "MONTHLY" }));

    const forClientA = await listPaymentsPage({ clientId: String(clientA._id) }, 1, 25);
    expect(forClientA.totalCount).toBe(2);

    const wiseOnly = await listPaymentsPage({ method: "WISE" }, 1, 25);
    expect(wiseOnly.totalCount).toBe(2);

    const setupOnly = await listPaymentsPage({ type: "SETUP" }, 1, 25);
    expect(setupOnly.totalCount).toBe(1);

    const dateRange = await listPaymentsPage({ from: "2026-09-01", to: "2026-09-01" }, 1, 25);
    expect(dateRange.totalCount).toBe(1);
  });

  it("includes the client's company name on each row", async () => {
    const client = await createTestClient({ company: "Labelled Co" });
    await createPayment(String(client._id), validPaymentInput());
    const { payments } = await listPaymentsPage({}, 1, 25);
    expect(payments[0].clientCompany).toBe("Labelled Co");
  });

  it("listAllFilteredPayments returns every filtered row, not just one page", async () => {
    const client = await createTestClient();
    for (let i = 0; i < 30; i++) {
      await createPayment(String(client._id), validPaymentInput({ paidAt: "2026-09-01" }));
    }
    const all = await listAllFilteredPayments({});
    expect(all).toHaveLength(30);
  });

  it("listPaymentsForClient returns only that client's payments, newest first", async () => {
    const clientA = await createTestClient({ email: "a@example.com" });
    const clientB = await createTestClient({ email: "b@example.com" });
    await createPayment(String(clientA._id), validPaymentInput({ paidAt: "2026-09-01" }));
    await createPayment(String(clientA._id), validPaymentInput({ paidAt: "2026-09-10" }));
    await createPayment(String(clientB._id), validPaymentInput({ paidAt: "2026-09-05" }));

    const forA = await listPaymentsForClient(String(clientA._id));
    expect(forA).toHaveLength(2);
    expect(forA[0].paidAt.getTime()).toBeGreaterThan(forA[1].paidAt.getTime());
  });
});

describe("getRevenueByType", () => {
  it("sums collected cents by type within the date range, as plain integers", async () => {
    const client = await createTestClient();
    await createPayment(String(client._id), validPaymentInput({ paidAt: "2026-09-05", type: "SETUP", amountCents: 19900 }));
    await createPayment(String(client._id), validPaymentInput({ paidAt: "2026-09-10", type: "MONTHLY", amountCents: 49900 }));
    await createPayment(String(client._id), validPaymentInput({ paidAt: "2026-09-15", type: "MONTHLY", amountCents: 49900 }));
    // Outside the range — must be excluded.
    await createPayment(String(client._id), validPaymentInput({ paidAt: "2026-01-01", type: "MONTHLY", amountCents: 99900 }));

    const revenue = await getRevenueByType({ from: "2026-09-01", to: "2026-09-30" });
    expect(revenue.setupCents).toBe(19900);
    expect(revenue.monthlyCents).toBe(99800);
    expect(revenue.otherCents).toBe(0);
    expect(revenue.totalCents).toBe(119700);
    expect(Number.isInteger(revenue.totalCents)).toBe(true);
  });

  it("returns all zeros for a range with no payments", async () => {
    const revenue = await getRevenueByType({ from: "2026-01-01", to: "2026-01-31" });
    expect(revenue).toEqual({ setupCents: 0, monthlyCents: 0, otherCents: 0, totalCents: 0 });
  });
});

describe("getMonthlyCollectedSeries", () => {
  it("returns the last N months with correct totals, including zero for a quiet month", async () => {
    const client = await createTestClient();
    await createPayment(String(client._id), validPaymentInput({ paidAt: "2026-07-15", amountCents: 10000 }));
    await createPayment(String(client._id), validPaymentInput({ paidAt: "2026-09-01", amountCents: 20000 }));
    await createPayment(String(client._id), validPaymentInput({ paidAt: "2026-09-20", amountCents: 5000 }));

    const now = new Date("2026-09-23T10:00:00.000Z");
    const series = await getMonthlyCollectedSeries(6, now);

    expect(series.map((row) => row.month)).toEqual([
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
    ]);
    expect(series.find((row) => row.month === "2026-07")?.collectedCents).toBe(10000);
    expect(series.find((row) => row.month === "2026-08")?.collectedCents).toBe(0);
    expect(series.find((row) => row.month === "2026-09")?.collectedCents).toBe(25000);
  });

  it("buckets a payment by its Dhaka calendar month, not its raw UTC month", async () => {
    const client = await createTestClient();
    // 2026-08-31T18:00:00Z is exactly 2026-09-01T00:00 in Dhaka.
    await createPayment(String(client._id), validPaymentInput({ paidAt: "2026-09-01", amountCents: 7500 }));

    const now = new Date("2026-09-23T10:00:00.000Z");
    const series = await getMonthlyCollectedSeries(6, now);
    expect(series.find((row) => row.month === "2026-09")?.collectedCents).toBe(7500);
    expect(series.find((row) => row.month === "2026-08")?.collectedCents).toBe(0);
  });
});
