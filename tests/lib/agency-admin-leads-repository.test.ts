// Must be the first import — sets MONGODB_URI to an isolated in-memory
// instance before mongoose.ts / the model / the repository are imported.
import { mongod } from "../helpers/mongodb-memory-server";

import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { connectToDatabase } from "@/lib/mongoose";
import { Inquiry } from "@/lib/models/inquiry";
import {
  addLeadNote,
  buildLeadsFilterQuery,
  changeLeadStatus,
  findLeadById,
  getDashboardStats,
  listAllFilteredLeads,
  listLeadsPage,
} from "@/lib/agency-admin/leads-repository";

beforeAll(async () => {
  await connectToDatabase();
});

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
    company: "Acme",
    website: "https://acme.example.com",
    service: "cold-email-outreach",
    budgetRange: "1k-plus",
    privacyConsent: true,
    status: "NEW",
    ...overrides,
  });
}

describe("buildLeadsFilterQuery", () => {
  it("returns an empty query when no filters are set", () => {
    expect(buildLeadsFilterQuery({})).toEqual({});
  });

  it("builds a case-insensitive $or search across name/email/website", () => {
    const query = buildLeadsFilterQuery({ q: "acme" });
    expect(query.$or).toHaveLength(3);
  });

  it("escapes regex metacharacters in the search term", () => {
    const query = buildLeadsFilterQuery({ q: "a.b*c" });
    const pattern = (query.$or?.[0] as { name: RegExp }).name;
    expect(pattern.test("a.b*c")).toBe(true);
    expect(pattern.test("axbyc")).toBe(false);
  });
});

describe("listLeadsPage", () => {
  it("returns newest-first, paginated results and a total count", async () => {
    await createLead({ email: "a@example.com", createdAt: new Date("2026-09-01T00:00:00Z") });
    await createLead({ email: "b@example.com", createdAt: new Date("2026-09-02T00:00:00Z") });
    await createLead({ email: "c@example.com", createdAt: new Date("2026-09-03T00:00:00Z") });

    const page1 = await listLeadsPage({}, 1, 2);
    expect(page1.totalCount).toBe(3);
    expect(page1.leads).toHaveLength(2);
    expect(page1.leads[0].email).toBe("c@example.com");

    const page2 = await listLeadsPage({}, 2, 2);
    expect(page2.leads).toHaveLength(1);
    expect(page2.leads[0].email).toBe("a@example.com");
  });

  it("filters by status and source", async () => {
    await createLead({ email: "won@example.com", status: "WON" });
    await createLead({ email: "new@example.com", status: "NEW" });
    await createLead({ email: "agency@example.com", source: "agencies-landing", need: "white-label", activeClients: "1-5" });

    const wonOnly = await listLeadsPage({ status: "WON" }, 1, 25);
    expect(wonOnly.leads.map((lead) => lead.email)).toEqual(["won@example.com"]);

    const agencyOnly = await listLeadsPage({ source: "agencies-landing" }, 1, 25);
    expect(agencyOnly.leads.map((lead) => lead.email)).toEqual(["agency@example.com"]);
  });

  it("filters by a Dhaka-interpreted date range", async () => {
    // 2026-09-01T17:59:59.999Z is still 2026-08-31 in Dhaka.
    await createLead({ email: "just-before@example.com", createdAt: new Date("2026-09-01T17:59:59.999Z") });
    // 2026-09-01T18:00:00.000Z is exactly 2026-09-02T00:00 in Dhaka.
    await createLead({ email: "just-after@example.com", createdAt: new Date("2026-09-01T18:00:00.000Z") });

    const result = await listLeadsPage({ from: "2026-09-02", to: "2026-09-02" }, 1, 25);
    expect(result.leads.map((lead) => lead.email)).toEqual(["just-after@example.com"]);
  });
});

describe("listAllFilteredLeads", () => {
  it("returns every matching row, not just one page", async () => {
    for (let i = 0; i < 30; i++) {
      await createLead({ email: `lead-${i}@example.com` });
    }
    const all = await listAllFilteredLeads({});
    expect(all).toHaveLength(30);
  });
});

describe("findLeadById / changeLeadStatus / addLeadNote", () => {
  it("finds a lead by id and returns null for a missing one", async () => {
    const created = await createLead();
    const found = await findLeadById(String(created._id));
    expect(found?.email).toBe("lead@example.com");

    const missing = await findLeadById(new mongoose.Types.ObjectId().toString());
    expect(missing).toBeNull();
  });

  it("changing status sets status and appends a statusHistory entry", async () => {
    const created = await createLead();
    const updated = await changeLeadStatus(String(created._id), "CONTACTED");
    expect(updated?.status).toBe("CONTACTED");
    expect(updated?.statusHistory).toHaveLength(1);
    expect(updated?.statusHistory[0].status).toBe("CONTACTED");

    const again = await changeLeadStatus(String(created._id), "CALL_BOOKED");
    expect(again?.statusHistory).toHaveLength(2);
  });

  it("an existing NEW document with no statusHistory field still loads and can transition", async () => {
    const connection = await connectToDatabase();
    const db = connection.connection.db;
    if (!db) throw new Error("no db");
    const inserted = await db.collection("inquiries").insertOne({
      source: "contact",
      name: "Legacy Lead",
      email: "legacy@example.com",
      website: "https://legacy.example.com",
      budgetRange: "1k-plus",
      privacyConsent: true,
      status: "NEW",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const found = await findLeadById(inserted.insertedId.toString());
    expect(found?.statusHistory).toEqual([]);
    expect(found?.notes).toEqual([]);

    const updated = await changeLeadStatus(inserted.insertedId.toString(), "CONTACTED");
    expect(updated?.statusHistory).toHaveLength(1);
  });

  it("adding a note appends to the notes array without touching status", async () => {
    const created = await createLead();
    const updated = await addLeadNote(String(created._id), "Called, left voicemail.");
    expect(updated?.notes).toHaveLength(1);
    expect(updated?.notes[0].text).toBe("Called, left voicemail.");
    expect(updated?.status).toBe("NEW");

    const again = await addLeadNote(String(created._id), "Follow-up scheduled.");
    expect(again?.notes).toHaveLength(2);
  });

  it("returns null for a status change or note on a nonexistent lead", async () => {
    const missingId = new mongoose.Types.ObjectId().toString();
    expect(await changeLeadStatus(missingId, "WON")).toBeNull();
    expect(await addLeadNote(missingId, "note")).toBeNull();
  });
});

describe("getDashboardStats", () => {
  it("aggregates totals by source, status, UTM campaign/content, and conversion counts", async () => {
    await createLead({ email: "a@example.com", status: "CALL_BOOKED" });
    await createLead({ email: "b@example.com", status: "WON" });
    await createLead({ email: "c@example.com", status: "NEW" });
    await createLead({
      email: "d@example.com",
      source: "agencies-landing",
      need: "white-label",
      activeClients: "1-5",
      attribution: { utmCampaign: "spring-promo", utmContent: "ad-1" },
    });

    const stats = await getDashboardStats({});
    expect(stats.totalLeads).toBe(4);
    expect(stats.toCallBookedOrBeyond).toBe(2); // CALL_BOOKED + WON
    expect(stats.toWon).toBe(1);
    expect(stats.bySource.find((row) => row.source === "agencies-landing")?.count).toBe(1);
    expect(stats.byStatus.find((row) => row.status === "WON")?.count).toBe(1);
    expect(stats.byUtmCampaign.find((row) => row.campaign === "spring-promo")?.count).toBe(1);
    expect(stats.byUtmContent.find((row) => row.content === "ad-1")?.count).toBe(1);
  });
});
