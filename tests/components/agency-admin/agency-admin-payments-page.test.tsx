// @vitest-environment jsdom
// Must be the first import — sets MONGODB_URI to an isolated in-memory
// instance before mongoose.ts / the repository are imported. Auth is
// enforced by the shared `/admin` layout (see agency-admin-layout.test.tsx).
import { mongod } from "../../helpers/mongodb-memory-server";

import { render, screen, within } from "@testing-library/react";
import mongoose from "mongoose";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { connectToDatabase } from "@/lib/mongoose";
import { Client } from "@/lib/models/client";
import { Payment } from "@/lib/models/payment";
import AdminPaymentsPage from "@/app/admin/payments/page";

afterEach(async () => {
  await Promise.all([Client.deleteMany({}), Payment.deleteMany({})]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

async function createClient(overrides: Partial<Record<string, unknown>> = {}) {
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

describe("AdminPaymentsPage", () => {
  it("shows an empty state when there are no payments", async () => {
    await connectToDatabase();
    const element = await AdminPaymentsPage({ searchParams: Promise.resolve({}) });
    render(element);
    expect(screen.getByText("No payments match these filters.")).toBeInTheDocument();
  });

  it("lists payments with the client company, amount, method, and type", async () => {
    const client = await createClient();
    await Payment.create({
      clientId: client._id,
      amountCents: 49900,
      currency: "USD",
      paidAt: new Date("2026-09-15"),
      method: "WISE",
      type: "MONTHLY",
    });

    const element = await AdminPaymentsPage({ searchParams: Promise.resolve({}) });
    render(element);

    const row = screen.getByTestId("payment-row");
    expect(within(row).getByText("Acme Inc")).toBeInTheDocument();
    expect(within(row).getByText("$499.00")).toBeInTheDocument();
    expect(within(row).getByText("Wise")).toBeInTheDocument();
    expect(within(row).getByText("Monthly")).toBeInTheDocument();
  });

  it("filters by type", async () => {
    const client = await createClient();
    await Payment.create({
      clientId: client._id,
      amountCents: 19900,
      currency: "USD",
      paidAt: new Date("2026-09-01"),
      method: "STRIPE",
      type: "SETUP",
    });
    await Payment.create({
      clientId: client._id,
      amountCents: 49900,
      currency: "USD",
      paidAt: new Date("2026-09-15"),
      method: "WISE",
      type: "MONTHLY",
    });

    const element = await AdminPaymentsPage({ searchParams: Promise.resolve({ type: "SETUP" }) });
    render(element);

    expect(screen.getByText("$199.00")).toBeInTheDocument();
    expect(screen.queryByText("$499.00")).not.toBeInTheDocument();
  });
});
