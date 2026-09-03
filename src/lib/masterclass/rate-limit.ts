import { createHmac } from "node:crypto";
import type { Collection } from "mongodb";

import { getDb } from "@/lib/masterclass/db";

/**
 * Durable, serverless-safe rate limiter backed by the same MongoDB database
 * every other masterclass write already uses — no separate service, no
 * Redis/Upstash. Ported verbatim (logic unchanged) from the MasumDev
 * masterclass source, which already had a proven serverless-safe
 * implementation; only the `getDb()` import path changed, to reuse Outbound
 * BD's existing Mongoose connection instead of opening a second one.
 */

export const RATE_LIMIT_COLLECTION = "masterclass_rate_limits";

/** Documents stay around this much longer than their window before TTL deletion — a debugging/safety margin, not part of the limit logic. */
const SAFETY_BUFFER_MS = 5 * 60 * 1000;

/** `"admin-auth"` is a deliberate addition (not in the MasumDev source) — see `requireMasterclassAdmin()`'s use of it in `admin-auth.ts`. */
export type RateLimitScope = "ip" | "email" | "admin-auth";

/**
 * IP: 30 attempts / 10 minutes — kept generous since shared mobile/carrier
 * NAT can place many unrelated, legitimate students behind one public IP.
 * Email: 5 attempts / 60 minutes — a tighter, identity-scoped limit.
 * admin-auth: 20 attempts / 15 minutes, keyed by IP — generous enough for a
 * single operator's normal burst of approve/reject clicks on the order
 * queue, tight enough to slow Basic Auth credential guessing.
 */
export const RATE_LIMIT_RULES: Record<RateLimitScope, { limit: number; windowMs: number }> = {
  ip: { limit: 30, windowMs: 10 * 60 * 1000 },
  email: { limit: 5, windowMs: 60 * 60 * 1000 },
  "admin-auth": { limit: 20, windowMs: 15 * 60 * 1000 },
};

/**
 * Only a keyed HMAC digest of the subject is ever stored — never the raw IP
 * or email. `subjectHash` cannot be reversed without `secret`
 * (`MASTERCLASS_RATE_LIMIT_SECRET`, never logged, never client-exposed).
 */
interface RateLimitDocument {
  scope: RateLimitScope;
  subjectHash: string;
  windowStart: Date;
  count: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

let indexesEnsured: Promise<void> | undefined;

async function ensureIndexes(collection: Collection<RateLimitDocument>): Promise<void> {
  indexesEnsured ??= (async () => {
    await Promise.all([
      collection.createIndex(
        { scope: 1, subjectHash: 1, windowStart: 1 },
        { unique: true, name: "uniq_scope_subject_window" },
      ),
      collection.createIndex(
        { expiresAt: 1 },
        { name: "ttl_expires_at", expireAfterSeconds: 0 },
      ),
    ]);
  })();
  return indexesEnsured;
}

async function getCollection(): Promise<Collection<RateLimitDocument>> {
  const db = await getDb();
  const collection = db.collection<RateLimitDocument>(RATE_LIMIT_COLLECTION);
  await ensureIndexes(collection);
  return collection;
}

function hashSubject(scope: RateLimitScope, subject: string, secret: string): string {
  return createHmac("sha256", secret).update(`${scope}:${subject}`).digest("hex");
}

/** Rounds `now` down to the start of its fixed window. */
function windowStartFor(now: Date, windowMs: number): Date {
  return new Date(now.getTime() - (now.getTime() % windowMs));
}

export interface CheckRateLimitInput {
  scope: RateLimitScope;
  /** Raw IP or normalized email — hashed inside this function, never persisted as-is. */
  subject: string;
  secret: string;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Atomic fixed-window counter via one upserting `findOneAndUpdate` per call.
 * Concurrent requests for the same `(scope, subjectHash, windowStart)`
 * serialize through the unique index and the atomic `$inc` — none of them
 * can read a stale count and slip past the limit.
 */
export async function checkRateLimit(input: CheckRateLimitInput): Promise<RateLimitResult> {
  const { limit, windowMs } = RATE_LIMIT_RULES[input.scope];
  const collection = await getCollection();
  const now = new Date();
  const windowStart = windowStartFor(now, windowMs);
  const subjectHash = hashSubject(input.scope, input.subject, input.secret);
  const expiresAt = new Date(windowStart.getTime() + windowMs + SAFETY_BUFFER_MS);

  const updated = await collection.findOneAndUpdate(
    { scope: input.scope, subjectHash, windowStart },
    {
      $inc: { count: 1 },
      $setOnInsert: { createdAt: now, expiresAt },
      $set: { updatedAt: now },
    },
    { upsert: true, returnDocument: "after" },
  );

  const count = updated?.count ?? 1;
  const windowEndMs = windowStart.getTime() + windowMs;
  const retryAfterSeconds = Math.max(1, Math.ceil((windowEndMs - now.getTime()) / 1000));

  return { allowed: count <= limit, retryAfterSeconds };
}
