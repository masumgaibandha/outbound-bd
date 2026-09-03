import type { ClientSession, Collection } from "mongodb";

import { getDb } from "@/lib/masterclass/db";

export const COUNTERS_COLLECTION = "masterclass_counters";

/** One document per counter name (e.g. `"registration:2026"`), atomically incremented. */
interface CounterDocument {
  _id: string;
  seq: number;
}

async function getCollection(): Promise<Collection<CounterDocument>> {
  const db = await getDb();
  return db.collection<CounterDocument>(COUNTERS_COLLECTION);
}

/**
 * Atomically returns the next integer in a named sequence, starting at 1.
 * Safe under concurrency: `$inc` on a single document via `findOneAndUpdate`
 * serializes competing callers through MongoDB itself. Ported verbatim from
 * the MasumDev masterclass source.
 */
export async function getNextSequence(name: string, session?: ClientSession): Promise<number> {
  const collection = await getCollection();
  const updated = await collection.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after", session },
  );
  if (!updated) {
    throw new Error(`Failed to increment counter "${name}".`);
  }
  return updated.seq;
}

/** `MC-2026-000123` — year of `now`, then a zero-padded 6-digit sequence number. */
export function formatRegistrationRef(year: number, seq: number): string {
  return `MC-${year}-${String(seq).padStart(6, "0")}`;
}

/**
 * Human-friendly, unique, sequential registration reference. One sequence
 * per calendar year, so `MC-2026-000001` doesn't collide with a
 * hypothetical `MC-2027-000001`.
 */
export async function generateHumanRegistrationRef(
  now: Date = new Date(),
  session?: ClientSession,
): Promise<string> {
  const year = now.getFullYear();
  const seq = await getNextSequence(`registration:${year}`, session);
  return formatRegistrationRef(year, seq);
}
