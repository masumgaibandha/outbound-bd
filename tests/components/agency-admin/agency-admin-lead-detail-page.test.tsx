// @vitest-environment jsdom
// Must be the first import — sets MONGODB_URI to an isolated in-memory
// instance before mongoose.ts / the repository are imported. Auth is
// enforced by the shared `/admin` layout (see agency-admin-layout.test.tsx).
import { mongod } from "../../helpers/mongodb-memory-server";

import { render, screen } from "@testing-library/react";
import mongoose from "mongoose";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

// `CreateClientForm` (rendered here for a WON lead with no client yet)
// calls `useRouter()` — real in the app's actual router context, but RTL
// renders outside of one, so it needs a stub. `notFound` (used by the page
// itself) must still be the real implementation.
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return { ...actual, useRouter: () => ({ push: vi.fn() }) };
});

import { connectToDatabase } from "@/lib/mongoose";
import { Client } from "@/lib/models/client";
import { Inquiry } from "@/lib/models/inquiry";
import AdminLeadDetailPage from "@/app/admin/leads/[id]/page";

afterEach(async () => {
  await Promise.all([Inquiry.deleteMany({}), Client.deleteMany({})]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

async function createLead(overrides: Partial<Record<string, unknown>> = {}) {
  return Inquiry.create({
    source: "contact",
    name: "Alex Prospect",
    email: "alex@example.com",
    website: "https://acme.example.com",
    service: "cold-email-outreach",
    budgetRange: "1k-plus",
    privacyConsent: true,
    status: "NEW",
    ...overrides,
  });
}

describe("AdminLeadDetailPage", () => {
  it("shows every stored field, including UTM attribution and landing path", async () => {
    await connectToDatabase();
    const created = await createLead({
      attribution: { utmSource: "facebook", utmCampaign: "spring-promo", landingPath: "/agencies" },
    });

    const element = await AdminLeadDetailPage({ params: Promise.resolve({ id: String(created._id) }) });
    render(element);

    expect(screen.getByText("Alex Prospect")).toBeInTheDocument();
    expect(screen.getByText("alex@example.com")).toBeInTheDocument();
    expect(screen.getByText("facebook")).toBeInTheDocument();
    expect(screen.getByText("spring-promo")).toBeInTheDocument();
    expect(screen.getByText("/agencies")).toBeInTheDocument();
  });

  it("renders a mailto link and a website link with rel noopener noreferrer, target _blank", async () => {
    const created = await createLead();
    const element = await AdminLeadDetailPage({ params: Promise.resolve({ id: String(created._id) }) });
    render(element);

    const mailLink = screen.getByText("alex@example.com").closest("a");
    expect(mailLink?.getAttribute("href")).toBe("mailto:alex@example.com");

    const websiteLink = screen.getByText("https://acme.example.com").closest("a");
    expect(websiteLink?.getAttribute("target")).toBe("_blank");
    expect(websiteLink?.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("shows 'No status changes yet' and 'No notes yet' for a document with neither", async () => {
    const created = await createLead();
    const element = await AdminLeadDetailPage({ params: Promise.resolve({ id: String(created._id) }) });
    render(element);

    expect(screen.getByText("No status changes yet.")).toBeInTheDocument();
    expect(screen.getByText("No notes yet.")).toBeInTheDocument();
  });

  it("shows notes newest first", async () => {
    const created = await createLead({
      notes: [
        { text: "First note", createdAt: new Date("2026-09-01T00:00:00Z") },
        { text: "Second note", createdAt: new Date("2026-09-02T00:00:00Z") },
      ],
    });

    const element = await AdminLeadDetailPage({ params: Promise.resolve({ id: String(created._id) }) });
    render(element);

    const noteTexts = screen.getAllByText(/^(First|Second) note$/).map((node) => node.textContent);
    expect(noteTexts).toEqual(["Second note", "First note"]);
  });

  it("shows a neutral message (not the create form) for a non-WON lead with no client yet", async () => {
    const created = await createLead({ status: "CONTACTED" });
    const element = await AdminLeadDetailPage({ params: Promise.resolve({ id: String(created._id) }) });
    render(element);

    expect(screen.getByText("Available once this lead is marked Won.")).toBeInTheDocument();
    expect(screen.queryByText("Create client")).not.toBeInTheDocument();
  });

  it("shows the prefilled create-client form for a WON lead with no client yet", async () => {
    const created = await createLead({ status: "WON", company: "Acme Co" });
    const element = await AdminLeadDetailPage({ params: Promise.resolve({ id: String(created._id) }) });
    render(element);

    expect(screen.getByText("Create client")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Alex Prospect")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Acme Co")).toBeInTheDocument();
    expect(screen.getByDisplayValue("alex@example.com")).toBeInTheDocument();
  });

  it("shows a link to the existing client instead of the form once one has been created", async () => {
    const created = await createLead({ status: "WON" });
    const client = await Client.create({
      name: "Alex Prospect",
      company: "Acme",
      email: "alex@example.com",
      website: "https://acme.example.com",
      sourceInquiryId: created._id,
      plan: "LAUNCH",
      monthlyAmountCents: 49900,
      currency: "USD",
      billingDayOfMonth: 1,
      startDate: new Date(),
      status: "ACTIVE",
    });

    const element = await AdminLeadDetailPage({ params: Promise.resolve({ id: String(created._id) }) });
    render(element);

    expect(screen.queryByText("Create client")).not.toBeInTheDocument();
    const link = screen.getByText("View client →");
    expect(link.closest("a")?.getAttribute("href")).toBe(`/admin/clients/${String(client._id)}`);
  });

  it("404s for a malformed id and for a well-formed but nonexistent id", async () => {
    await expect(
      AdminLeadDetailPage({ params: Promise.resolve({ id: "not-an-id" }) }),
    ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");

    await expect(
      AdminLeadDetailPage({ params: Promise.resolve({ id: new mongoose.Types.ObjectId().toString() }) }),
    ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  });
});
