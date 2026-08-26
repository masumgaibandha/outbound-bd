import { MongoClient } from "mongodb";

import { env } from "@/lib/env";

declare global {
  var _mongoClient: MongoClient | undefined;
}

// `new MongoClient(...)` and `.db()` don't perform any network I/O; the
// driver connects lazily on the first real operation. Cached on
// `globalThis` so hot-reloading in dev doesn't create a new client on
// every module reload.
export const mongoClient = globalThis._mongoClient ?? new MongoClient(env.MONGODB_URI);

if (process.env.NODE_ENV !== "production") {
  globalThis._mongoClient = mongoClient;
}

export function getDb() {
  return mongoClient.db();
}
