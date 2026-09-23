// @vitest-environment jsdom
// Must be the first import — sets MONGODB_URI to an isolated in-memory
// instance before mongoose.ts / the repository are imported. Auth is
// enforced by the shared `/admin` layout (see agency-admin-layout.test.tsx).
import { mongod } from "../../helpers/mongodb-memory-server";

import { render, screen } from "@testing-library/react";
import mongoose from "mongoose";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { connectToDatabase } from "@/lib/mongoose";
import { Client } from "@/lib/models/client";
import { Inquiry } from "@/lib/models/inquiry";
import { Payment } from "@/lib/models/payment";
import AdminClientDetailPage from "@/app/admin/clients/[id]/page";

afterEach(async () => {
  await Promise.all([Client.deleteMany({}), Payment.deleteMany({}), Inquiry.deleteMany({})]);
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

describe("AdminClientDetailPage", () => {
  it("shows the client's details, edit form, and a no-payments/no-notes empty state", async () => {
    await connectToDatabase();
    const client = await createClient();
    const element = await AdminClientDetailPage({ params: Promise.resolve({ id: String(client._id) }) });
    render(element);

    expect(screen.getByText("Acme Inc")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Alex Founder")).toBeInTheDocument();
    expect(screen.getByText("No payments recorded yet.")).toBeInTheDocument();
    expect(screen.getByText("No notes yet.")).toBeInTheDocument();
  });

  it("shows a link back to the source lead when linked", async () => {
    const lead = await Inquiry.create({
      source: "contact",
      name: "Lead Name",
      email: "lead@example.com",
      website: "https://lead.example.com",
      budgetRange: "1k-plus",
      privacyConsent: true,
      status: "WON",
    });
    const client = await createClient({ sourceInquiryId: lead._id });

    const element = await AdminClientDetailPage({ params: Promise.resolve({ id: String(client._id) }) });
    render(element);

    const link = screen.getByText("View source lead").closest("a");
    expect(link?.getAttribute("href")).toBe(`/admin/leads/${String(lead._id)}`);
  });

  it("lists that client's payments and the total collected", async () => {
    const client = await createClient();
    await Payment.create({
      clientId: client._id,
      amountCents: 49900,
      currency: "USD",
      paidAt: new Date("2026-09-15"),
      method: "WISE",
      type: "MONTHLY",
    });

    const element = await AdminClientDetailPage({ params: Promise.resolve({ id: String(client._id) }) });
    render(element);

    // Appears twice: once as the running "collected to date" total, once as
    // the payment row's own amount.
    expect(screen.getAllByText("$499.00")).toHaveLength(2);
    expect(screen.getByText(/Collected to date/)).toBeInTheDocument();
  });

  it("404s for a malformed id and for a well-formed but nonexistent id", async () => {
    await expect(
      AdminClientDetailPage({ params: Promise.resolve({ id: "not-an-id" }) }),
    ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");

    await expect(
      AdminClientDetailPage({ params: Promise.resolve({ id: new mongoose.Types.ObjectId().toString() }) }),
    ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  });
});
