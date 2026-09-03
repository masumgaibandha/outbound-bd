import { MongoMemoryReplSet } from "mongodb-memory-server";

/**
 * The masterclass registration flow (`registration-service.ts`) writes the
 * registration and its draft payment order inside a single
 * `session.withTransaction()` call. A standalone `mongodb-memory-server`
 * instance (see `tests/helpers/mongodb-memory-server.ts`, used by every
 * non-masterclass test) does NOT support multi-document transactions — only
 * a replica set does. A single-node replica set is the smallest topology
 * that still supports transactions, so that's what this starts.
 *
 * Same import-order requirement as the standalone helper: `src/lib/env.ts`
 * reads `process.env.MONGODB_URI` at module top-level, so this must be
 * imported — as the very first line — before anything that imports env.ts
 * (mongoose.ts, masterclass/db.ts, any masterclass route/service). The
 * top-level `await` below runs to completion before later imports in the
 * same file are evaluated, per ESM module-evaluation order.
 *
 * Never points at the real MONGODB_URI / production Atlas cluster.
 */
export const mongod = await MongoMemoryReplSet.create({
  replSet: { count: 1, storageEngine: "wiredTiger" },
});

process.env.MONGODB_URI = mongod.getUri("outbound-bd-test");
process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";
