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
import { Inquiry } from "@/lib/models/inquiry";
import AdminDashboardPage from "@/app/admin/page";

afterEach(async () => {
  await Inquiry.deleteMany({});
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
  it("shows a revenue placeholder, never a fabricated figure", async () => {
    await connectToDatabase();
    const element = await AdminDashboardPage({ searchParams: Promise.resolve({}) });
    render(element);

    expect(screen.getByText("Coming soon")).toBeInTheDocument();
    expect(screen.getByText("Revenue (Round 4B)")).toBeInTheDocument();
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
});
