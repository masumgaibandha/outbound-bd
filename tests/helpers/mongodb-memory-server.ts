import { MongoMemoryServer } from "mongodb-memory-server";

/**
 * `src/lib/env.ts` reads `process.env.MONGODB_URI` at module top-level, so
 * that variable must exist BEFORE anything importing env.ts (mongoose.ts,
 * models/inquiry.ts, the /api/inquiries route) is imported. Import this
 * module first — as the very first line — in any test file that touches
 * the database; its top-level await runs to completion before subsequent
 * imports in that file are evaluated, per ESM module-evaluation order.
 *
 * Never points at the real MONGODB_URI / production Atlas cluster — this
 * starts an isolated, in-memory MongoDB instance per test file.
 */
export const mongod = await MongoMemoryServer.create();

process.env.MONGODB_URI = mongod.getUri("outbound-bd-test");
process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";
