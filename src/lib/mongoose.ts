import mongoose from "mongoose";

import { getDatabaseEnv } from "@/lib/env";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var _mongooseCache: MongooseCache | undefined;
}

// Cached on `globalThis` so hot-reloading in dev doesn't open a new
// connection on every module reload.
const cache: MongooseCache = globalThis._mongooseCache ?? {
  conn: null,
  promise: null,
};

if (process.env.NODE_ENV !== "production") {
  globalThis._mongooseCache = cache;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cache.conn) {
    return cache.conn;
  }

  // If the connection attempt fails, clear the cached promise so the next
  // call retries instead of permanently re-throwing the same rejection.
  cache.promise ??= mongoose.connect(getDatabaseEnv().MONGODB_URI).catch((error) => {
    cache.promise = null;
    throw error;
  });

  cache.conn = await cache.promise;
  return cache.conn;
}
