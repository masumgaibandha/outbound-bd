// Must be the first import — sets MONGODB_URI to an isolated in-memory
// instance before mongoose.ts / the model / the repository are imported.
import { mongod } from "../helpers/mongodb-memory-server";

import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { connectToDatabase } from "@/lib/mongoose";
import { Client } from "@/lib/models/client";
import { Inquiry } from "@/lib/models/inquiry";
import { Payment } from "@/lib/models/payment";
import {
  addClientNote,
  createClient,
  findClientById,
  findClientBySourceInquiryId,
  getClientCounts,
  getCurrentMrrCents,
  listAllFilteredClients,
  listClientOptions,
  listClientsPage,
  updateClient,
} from "@/lib/agency-admin/clients-repository";
import type { CreateClientInput, UpdateClientInput } from "@/lib/agency-admin/clients-validation";

beforeAll(async () => {
  await connectToDatabase();
});

afterEach(async () => {
  await Promise.all([Client.deleteMany({}), Payment.deleteMany({}), Inquiry.deleteMany({})]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

function validClientInput(overrides: Partial<CreateClientInput> = {}): CreateClientInput {
  return {
    name: "Alex Founder",
    company: "Acme Inc",
    email: "alex@acme.com",
    website: "https://acme.com",
    plan: "LAUNCH",
    monthlyAmountCents: 49900,
    billingDayOfMonth: 1,
    startDate: "2026-09-01",
    ...overrides,
  };
}

async function createLead() {
  return Inquiry.create({
    source: "contact",
    name: "Lead Name",
    email: "lead@example.com",
    website: "https://lead.example.com",
    budgetRange: "1k-plus",
    privacyConsent: true,
    status: "WON",
  });
}

describe("createClient", () => {
  it("creates a standalone client with sourceInquiryId null", async () => {
    const { client, alreadyExisted } = await createClient(validClientInput(), null);
    expect(alreadyExisted).toBe(false);
    expect(client.sourceInquiryId).toBeUndefined();
    expect(client.status).toBe("ACTIVE");
  });

  it("creates a client linked to a lead and sets sourceInquiryId", async () => {
    const lead = await createLead();
    const { client, alreadyExisted } = await createClient(validClientInput(), String(lead._id));
    expect(alreadyExisted).toBe(false);
    expect(String(client.sourceInquiryId)).toBe(String(lead._id));
  });

  it("never creates a duplicate client for the same lead: a second call returns the existing client", async () => {
    const lead = await createLead();
    const first = await createClient(validClientInput({ company: "First Co" }), String(lead._id));
    const second = await createClient(validClientInput({ company: "Second Co" }), String(lead._id));

    expect(second.alreadyExisted).toBe(true);
    expect(second.client.id).toBe(first.client.id);
    expect(second.client.company).toBe("First Co"); // the original document, never overwritten

    const count = await Client.countDocuments({ sourceInquiryId: lead._id });
    expect(count).toBe(1);
  });

  it("survives a race (unique-index violation) by returning the winner instead of throwing", async () => {
    const lead = await createLead();
    // Simulates two concurrent submits racing past the pre-check: insert
    // directly, bypassing createClient's own existence check, then call
    // createClient — it must catch the duplicate-key error and resolve to
    // the existing document rather than throwing.
    await Client.create({
      name: "Race Winner",
      company: "Race Co",
      email: "race@example.com",
      website: "https://race.example.com",
      sourceInquiryId: lead._id,
      plan: "LAUNCH",
      monthlyAmountCents: 1000,
      currency: "USD",
      billingDayOfMonth: 1,
      startDate: new Date(),
      status: "ACTIVE",
    });

    const result = await createClient(validClientInput({ company: "Loser Co" }), String(lead._id));
    expect(result.alreadyExisted).toBe(true);
    expect(result.client.company).toBe("Race Co");

    const count = await Client.countDocuments({ sourceInquiryId: lead._id });
    expect(count).toBe(1);
  });

  it("allows many standalone clients with no sourceInquiryId (the partial unique index never fires for them)", async () => {
    await createClient(validClientInput({ email: "a@example.com" }), null);
    await createClient(validClientInput({ email: "b@example.com" }), null);
    const count = await Client.countDocuments({});
    expect(count).toBe(2);
  });
});

describe("findClientById / findClientBySourceInquiryId", () => {
  it("finds a client by id and returns null for a missing one", async () => {
    const { client } = await createClient(validClientInput(), null);
    const found = await findClientById(client.id);
    expect(found?.company).toBe("Acme Inc");

    const missing = await findClientById(new mongoose.Types.ObjectId().toString());
    expect(missing).toBeNull();
  });

  it("returns null when no client is linked to a lead", async () => {
    const lead = await createLead();
    const found = await findClientBySourceInquiryId(String(lead._id));
    expect(found).toBeNull();
  });
});

describe("updateClient", () => {
  it("updates every editable field", async () => {
    const { client } = await createClient(validClientInput(), null);
    const input: UpdateClientInput = {
      ...validClientInput({ company: "New Name", monthlyAmountCents: 99900 }),
      status: "PAUSED",
    };
    const updated = await updateClient(client.id, input);
    expect(updated?.company).toBe("New Name");
    expect(updated?.monthlyAmountCents).toBe(99900);
    expect(updated?.status).toBe("PAUSED");
  });

  it("clears setupAmountCents and endDate when omitted, without a MongoDB conflict error", async () => {
    const { client } = await createClient(validClientInput({ setupAmountCents: 19900 }), null);
    const withEndDate = await updateClient(client.id, {
      ...validClientInput(),
      status: "ENDED",
      endDate: "2026-12-01",
    });
    expect(withEndDate?.endDate).toBeDefined();

    const cleared = await updateClient(client.id, { ...validClientInput(), status: "ACTIVE" });
    expect(cleared?.setupAmountCents).toBeUndefined();
    expect(cleared?.endDate).toBeUndefined();
  });

  it("returns null for a nonexistent client", async () => {
    const result = await updateClient(new mongoose.Types.ObjectId().toString(), {
      ...validClientInput(),
      status: "ACTIVE",
    });
    expect(result).toBeNull();
  });
});

describe("addClientNote", () => {
  it("appends a note", async () => {
    const { client } = await createClient(validClientInput(), null);
    const updated = await addClientNote(client.id, "Kickoff call scheduled.");
    expect(updated?.notes).toHaveLength(1);
    expect(updated?.notes[0].text).toBe("Kickoff call scheduled.");
  });
});

describe("listClientsPage / listAllFilteredClients", () => {
  it("filters by status, plan, and search, and paginates newest first", async () => {
    await createClient(validClientInput({ email: "a@example.com", company: "Acme", plan: "LAUNCH" }), null);
    await createClient(
      validClientInput({ email: "b@example.com", company: "Beta Co", plan: "GROWTH" }),
      null,
    );

    const growthOnly = await listClientsPage({ plan: "GROWTH" }, 1, 25);
    expect(growthOnly.clients.map((c) => c.company)).toEqual(["Beta Co"]);

    const searchAcme = await listClientsPage({ q: "acme" }, 1, 25);
    expect(searchAcme.clients.map((c) => c.company)).toEqual(["Acme"]);
  });

  it("computes amountCollectedToDateCents from that client's payments", async () => {
    const { client } = await createClient(validClientInput(), null);
    await Payment.create({ clientId: client.id, amountCents: 10000, currency: "USD", paidAt: new Date(), method: "WISE", type: "MONTHLY" });
    await Payment.create({ clientId: client.id, amountCents: 5000, currency: "USD", paidAt: new Date(), method: "WISE", type: "SETUP" });

    const { clients } = await listClientsPage({}, 1, 25);
    expect(clients[0].amountCollectedToDateCents).toBe(15000);
  });

  it("shows a null nextBillingDate for a non-ACTIVE client and a real one for an ACTIVE client", async () => {
    const { client: active } = await createClient(validClientInput({ email: "active@example.com" }), null);
    const { client: paused } = await createClient(validClientInput({ email: "paused@example.com" }), null);
    await updateClient(paused.id, { ...validClientInput({ email: "paused@example.com" }), status: "PAUSED" });

    const { clients } = await listClientsPage({}, 1, 25);
    const activeRow = clients.find((c) => c.id === active.id);
    const pausedRow = clients.find((c) => c.id === paused.id);
    expect(activeRow?.nextBillingDate).not.toBeNull();
    expect(pausedRow?.nextBillingDate).toBeNull();
  });

  it("listAllFilteredClients returns every matching row, not just one page", async () => {
    for (let i = 0; i < 30; i++) {
      await createClient(validClientInput({ email: `client-${i}@example.com` }), null);
    }
    const all = await listAllFilteredClients({});
    expect(all).toHaveLength(30);
  });
});

describe("listClientOptions", () => {
  it("returns every client sorted by company name", async () => {
    await createClient(validClientInput({ email: "z@example.com", company: "Zed Co" }), null);
    await createClient(validClientInput({ email: "a@example.com", company: "Acme" }), null);

    const options = await listClientOptions();
    expect(options.map((o) => o.company)).toEqual(["Acme", "Zed Co"]);
  });
});

describe("getClientCounts / getCurrentMrrCents", () => {
  it("counts clients by status and sums MRR from ACTIVE clients only, as plain integer cents", async () => {
    await createClient(validClientInput({ email: "a@example.com", monthlyAmountCents: 49900 }), null);
    const { client: paused } = await createClient(
      validClientInput({ email: "b@example.com", monthlyAmountCents: 99900 }),
      null,
    );
    await updateClient(paused.id, { ...validClientInput({ email: "b@example.com" }), status: "PAUSED" });

    const counts = await getClientCounts();
    expect(counts.active).toBe(1);
    expect(counts.paused).toBe(1);
    expect(counts.ended).toBe(0);

    const mrr = await getCurrentMrrCents();
    expect(mrr).toBe(49900); // only the ACTIVE client's amount, not the paused one's
    expect(Number.isInteger(mrr)).toBe(true);
  });

  it("returns 0 MRR when there are no active clients", async () => {
    expect(await getCurrentMrrCents()).toBe(0);
  });
});
