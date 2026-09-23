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
import AdminLeadDetailPage from "@/app/admin/leads/[id]/page";

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

  it("404s for a malformed id and for a well-formed but nonexistent id", async () => {
    await expect(
      AdminLeadDetailPage({ params: Promise.resolve({ id: "not-an-id" }) }),
    ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");

    await expect(
      AdminLeadDetailPage({ params: Promise.resolve({ id: new mongoose.Types.ObjectId().toString() }) }),
    ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  });
});
