// Must be the first import — sets MONGODB_URI to an isolated in-memory
// instance before mongoose.ts / the model are imported.
import { mongod } from "../helpers/mongodb-memory-server";

import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { connectToDatabase } from "@/lib/mongoose";
import { Inquiry } from "@/lib/models/inquiry";

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

describe("Inquiry model — source default", () => {
  it("defaults source to 'contact' when creating a document that doesn't specify it", async () => {
    const created = await Inquiry.create({
      name: "Test",
      email: "default@example.com",
      website: "https://example.com",
      budgetRange: "1k-plus",
      privacyConsent: true,
      status: "NEW",
    });
    expect(created.source).toBe("contact");
  });

  it("reads a legacy document (inserted without source via the raw driver) back as source: 'contact' through the Mongoose model", async () => {
    // Bypasses Mongoose entirely, simulating a genuinely pre-Round-2
    // document — no `source` field stored at all.
    const connection = await connectToDatabase();
    const db = connection.connection.db;
    if (!db) throw new Error("no db");
    await db.collection("inquiries").insertOne({
      name: "Legacy Visitor",
      email: "legacy@example.com",
      company: "Legacy Co",
      website: "https://legacy.example.com",
      service: "cold-email-outreach",
      targetMarket: "SMBs",
      monthlyOutreachVolume: "under-500",
      budgetRange: "under-2k",
      goals: "Book more calls",
      privacyConsent: true,
      status: "NEW",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const found = await Inquiry.findOne({ email: "legacy@example.com" });
    expect(found?.source).toBe("contact");
  });

  it("stores and reads back an agencies-landing document with its own fields, and no company/service/goals", async () => {
    const created = await Inquiry.create({
      source: "agencies-landing",
      name: "Alex Agency",
      email: "alex@agency.com",
      website: "https://agency.com",
      activeClients: "16-50",
      need: "white-label",
      budgetRange: "1k-plus",
      attribution: { utmSource: "facebook", landingPath: "/agencies" },
      privacyConsent: true,
      status: "NEW",
    });

    expect(created.source).toBe("agencies-landing");
    expect(created.activeClients).toBe("16-50");
    expect(created.attribution?.utmSource).toBe("facebook");
    expect(created.company).toBeUndefined();
    expect(created.service).toBeUndefined();
    expect(created.goals).toBeUndefined();
  });
});
