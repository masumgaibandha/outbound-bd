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
import AdminClientsPage from "@/app/admin/clients/page";

afterEach(async () => {
  await Client.deleteMany({});
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

describe("AdminClientsPage", () => {
  it("shows an empty state and an Add client link", async () => {
    await connectToDatabase();
    const element = await AdminClientsPage({ searchParams: Promise.resolve({}) });
    render(element);

    expect(screen.getByText("No clients match these filters.")).toBeInTheDocument();
    const addLink = screen.getByText("Add client").closest("a");
    expect(addLink?.getAttribute("href")).toBe("/admin/clients/new");
  });

  it("lists clients with their plan, monthly amount, and status", async () => {
    await createClient();
    const element = await AdminClientsPage({ searchParams: Promise.resolve({}) });
    render(element);

    const row = screen.getAllByRole("row")[1]; // [0] is the header row
    expect(within(row).getByText("Acme Inc")).toBeInTheDocument();
    expect(within(row).getByText("Launch")).toBeInTheDocument();
    expect(within(row).getByText("$499.00")).toBeInTheDocument();
    expect(within(row).getByText("Active")).toBeInTheDocument();
  });

  it("filters by plan", async () => {
    await createClient({ email: "a@example.com", company: "Launch Co", plan: "LAUNCH" });
    await createClient({ email: "b@example.com", company: "Growth Co", plan: "GROWTH" });

    const element = await AdminClientsPage({ searchParams: Promise.resolve({ plan: "GROWTH" }) });
    render(element);

    expect(screen.getByText("Growth Co")).toBeInTheDocument();
    expect(screen.queryByText("Launch Co")).not.toBeInTheDocument();
  });

  it("shows N/A for next billing date on a paused client", async () => {
    await createClient({ status: "PAUSED" });
    const element = await AdminClientsPage({ searchParams: Promise.resolve({}) });
    render(element);

    expect(screen.getByText("N/A")).toBeInTheDocument();
  });
});
