// @vitest-environment jsdom
// Must be the first import — sets MONGODB_URI to an isolated in-memory
// instance before mongoose.ts / the repository are imported. Auth is
// enforced by the shared `/admin` layout (see agency-admin-layout.test.tsx).
import { mongod } from "../../helpers/mongodb-memory-server";

import { render, screen } from "@testing-library/react";
import mongoose from "mongoose";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { connectToDatabase } from "@/lib/mongoose";
import { Inquiry } from "@/lib/models/inquiry";
import AdminLeadsPage from "@/app/admin/leads/page";

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

describe("AdminLeadsPage", () => {
  it("shows an empty state when no leads match", async () => {
    await connectToDatabase();
    const element = await AdminLeadsPage({ searchParams: Promise.resolve({}) });
    render(element);
    expect(screen.getByText("No leads match these filters.")).toBeInTheDocument();
  });

  it("lists leads newest first with the CSV download link reflecting the current filters", async () => {
    await connectToDatabase();
    await createLead({ email: "older@example.com", createdAt: new Date("2026-09-01T00:00:00Z") });
    await createLead({ email: "newer@example.com", createdAt: new Date("2026-09-05T00:00:00Z") });

    const element = await AdminLeadsPage({ searchParams: Promise.resolve({ status: "NEW" }) });
    render(element);

    const rows = screen.getAllByRole("row").slice(1); // skip header row
    expect(rows[0]).toHaveTextContent("newer@example.com");
    expect(rows[1]).toHaveTextContent("older@example.com");

    const csvLink = screen.getByText("Download CSV").closest("a");
    expect(csvLink?.getAttribute("href")).toBe("/admin/leads/export?status=NEW");
  });

  it("links each lead's name to its detail page", async () => {
    const created = await createLead();
    const element = await AdminLeadsPage({ searchParams: Promise.resolve({}) });
    render(element);

    const link = screen.getByText("Test Lead").closest("a");
    expect(link?.getAttribute("href")).toBe(`/admin/leads/${created._id}`);
  });

  it("shows pagination controls when there are more leads than one page", async () => {
    for (let i = 0; i < 30; i++) {
      await createLead({ email: `lead-${i}@example.com` });
    }
    const element = await AdminLeadsPage({ searchParams: Promise.resolve({}) });
    render(element);

    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
    expect(screen.queryByText("Previous")).not.toBeInTheDocument();
  });
});
