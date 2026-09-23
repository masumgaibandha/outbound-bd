// @vitest-environment jsdom
// Must be the first import — sets MONGODB_URI to an isolated in-memory
// instance before mongoose.ts / the repository are imported. Auth itself is
// enforced by the shared `/admin` layout (see agency-admin-layout.test.tsx)
// — this page, like the masterclass admin's Students/Enrollments/Dashboard
// pages, never re-checks it directly.
import { mongod } from "../../helpers/mongodb-memory-server";

import { render, screen } from "@testing-library/react";
import mongoose from "mongoose";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { connectToDatabase } from "@/lib/mongoose";
import { Client } from "@/lib/models/client";
import { Inquiry } from "@/lib/models/inquiry";
import { Payment } from "@/lib/models/payment";
import AdminDashboardPage from "@/app/admin/page";

afterEach(async () => {
  await Promise.all([Inquiry.deleteMany({}), Client.deleteMany({}), Payment.deleteMany({})]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

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

describe("AdminDashboardPage", () => {
  it("shows real (zero) revenue figures, never a placeholder, when there are no clients or payments", async () => {
    await connectToDatabase();
    const element = await AdminDashboardPage({ searchParams: Promise.resolve({}) });
    render(element);

    expect(screen.queryByText("Coming soon")).not.toBeInTheDocument();
    expect(screen.getByTestId("collected-total")).toHaveTextContent("$0.00");
    expect(screen.getByTestId("current-mrr")).toHaveTextContent("$0.00");
    expect(screen.getByTestId("clients-active")).toHaveTextContent("0");
  });

  it("shows totals, by-source, and by-status breakdowns for leads inside the default range", async () => {
    await connectToDatabase();
    await createLead({ email: "a@example.com", status: "WON" });
    await createLead({ email: "b@example.com", source: "agencies-landing", need: "white-label", activeClients: "1-5" });

    const element = await AdminDashboardPage({ searchParams: Promise.resolve({}) });
    render(element);

    expect(screen.getByTestId("total-leads")).toHaveTextContent("2");
    expect(screen.getByText("Contact form")).toBeInTheDocument();
    expect(screen.getByText("Agencies landing page")).toBeInTheDocument();
  });

  it("respects an explicit from/to date range and excludes leads outside it", async () => {
    await connectToDatabase();
    await createLead({ email: "inside@example.com", createdAt: new Date("2026-09-15T00:00:00Z") });
    await createLead({ email: "outside@example.com", createdAt: new Date("2026-01-01T00:00:00Z") });

    const element = await AdminDashboardPage({
      searchParams: Promise.resolve({ from: "2026-09-01", to: "2026-09-30" }),
    });
    render(element);

    expect(screen.getByTestId("total-leads")).toHaveTextContent("1");
  });

  it("shows collected revenue and committed MRR as distinct figures, never confused with each other", async () => {
    await connectToDatabase();
    const client = await Client.create({
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
    // Collected (a payment) and committed MRR (the client's monthly rate)
    // are deliberately different amounts here, to prove the dashboard never
    // conflates the two.
    await Payment.create({
      clientId: client._id,
      amountCents: 19900,
      currency: "USD",
      paidAt: new Date("2026-09-10"),
      method: "STRIPE",
      type: "SETUP",
    });

    const element = await AdminDashboardPage({
      searchParams: Promise.resolve({ from: "2026-09-01", to: "2026-09-30" }),
    });
    render(element);

    expect(screen.getByTestId("collected-setup")).toHaveTextContent("$199.00");
    expect(screen.getByTestId("collected-monthly")).toHaveTextContent("$0.00");
    expect(screen.getByTestId("collected-total")).toHaveTextContent("$199.00");
    expect(screen.getByTestId("current-mrr")).toHaveTextContent("$499.00");
    expect(screen.getByTestId("clients-active")).toHaveTextContent("1");
  });

  it("computes average revenue per active client from MRR, rounded once at display time", async () => {
    await connectToDatabase();
    await Client.create({
      name: "A",
      company: "A Co",
      email: "a@example.com",
      website: "https://a.example.com",
      plan: "CUSTOM",
      monthlyAmountCents: 10000,
      currency: "USD",
      billingDayOfMonth: 1,
      startDate: new Date("2026-09-01"),
      status: "ACTIVE",
    });
    await Client.create({
      name: "B",
      company: "B Co",
      email: "b@example.com",
      website: "https://b.example.com",
      plan: "CUSTOM",
      monthlyAmountCents: 10001,
      currency: "USD",
      billingDayOfMonth: 1,
      startDate: new Date("2026-09-01"),
      status: "ACTIVE",
    });

    const element = await AdminDashboardPage({ searchParams: Promise.resolve({}) });
    render(element);

    // (10000 + 10001) / 2 = 10000.5 -> rounds to 10001 cents = $100.01.
    expect(screen.getByText("$100.01")).toBeInTheDocument();
  });
});
