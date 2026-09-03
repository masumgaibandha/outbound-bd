import "server-only";

import type { Db, MongoClient } from "mongodb";

import { connectToDatabase } from "@/lib/mongoose";

/**
 * The masterclass repositories (ported from MasumDev) are written against
 * the native `mongodb` driver's `Collection`/`ClientSession`/`Db` API, not
 * Mongoose schemas — that's a deliberate choice preserved from the source:
 * atomic `findOneAndUpdate` upserts, partial unique indexes, and
 * multi-document transactions are all native-driver idioms with no
 * equivalent gain from wrapping them in a Mongoose model.
 *
 * Rather than opening a second MongoDB connection pool, these two functions
 * reach into Outbound BD's *existing* cached Mongoose connection
 * (`src/lib/mongoose.ts`) and hand back the underlying native `Db`/`MongoClient`
 * it already holds — one connection, one scoped `outbound-bd` database,
 * shared by the agency's Mongoose models and the masterclass's native-driver
 * repositories alike. `mongodb` itself is not a direct dependency of this
 * project (see CLAUDE.md); it's present in `node_modules` as Mongoose's own
 * transitive dependency, and only its *types* are imported here.
 */
export async function getDb(): Promise<Db> {
  const connection = await connectToDatabase();
  const db = connection.connection.db;
  if (!db) {
    throw new Error("Mongoose connection has no native Db handle yet.");
  }
  return db;
}

/** Needed for `session.startSession()` — multi-document transactions across the registrations + payment_orders collections. */
export async function getMongoClient(): Promise<MongoClient> {
  const connection = await connectToDatabase();
  return connection.connection.getClient();
}
