// Must be the first import — sets MONGODB_URI to an isolated in-memory
// instance before env.ts / mongoose.ts / rate-limit.ts are imported.
import { mongod } from "../helpers/mongodb-memory-server";

import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { connectToDatabase } from "@/lib/mongoose";
import { checkRateLimit, RATE_LIMIT_COLLECTION } from "@/lib/masterclass/rate-limit";

const SECRET = "test-rate-limit-secret";

beforeAll(async () => {
  await connectToDatabase();
});

beforeEach(async () => {
  const connection = await connectToDatabase();
  await connection.connection.db?.collection(RATE_LIMIT_COLLECTION).deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("checkRateLimit", () => {
  it("allows requests under the limit and stores only a keyed hash, never the raw subject", async () => {
    const result = await checkRateLimit({ scope: "email", subject: "student@example.com", secret: SECRET });
    expect(result.allowed).toBe(true);

    const connection = await connectToDatabase();
    const doc = await connection.connection.db?.collection(RATE_LIMIT_COLLECTION).findOne({});
    expect(doc).toBeTruthy();
    expect(JSON.stringify(doc)).not.toContain("student@example.com");
    expect(doc?.subjectHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is durable across separate calls — state persists in Mongo, not process memory", async () => {
    const subject = "203.0.113.5";
    for (let i = 0; i < 5; i++) {
      await checkRateLimit({ scope: "ip", subject, secret: SECRET });
    }
    const connection = await connectToDatabase();
    const doc = await connection.connection.db
      ?.collection(RATE_LIMIT_COLLECTION)
      .findOne({ scope: "ip" });
    expect(doc?.count).toBe(5);
  });

  it("blocks once the scope's limit is exceeded within the window", async () => {
    const subject = "blocked@example.com";
    let last;
    for (let i = 0; i < 6; i++) {
      // email scope limit is 5/hour
      last = await checkRateLimit({ scope: "email", subject, secret: SECRET });
    }
    expect(last?.allowed).toBe(false);
    expect(last?.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("scopes independently — an IP-scope block doesn't affect the email scope for the same underlying subject value", async () => {
    const subject = "shared-value@example.com";
    for (let i = 0; i < 6; i++) {
      await checkRateLimit({ scope: "email", subject, secret: SECRET });
    }
    const ipResult = await checkRateLimit({ scope: "ip", subject, secret: SECRET });
    expect(ipResult.allowed).toBe(true);
  });
});
