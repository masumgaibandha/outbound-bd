import { createHash } from "node:crypto";
import type { ObjectId } from "mongodb";

/**
 * Deterministic SHA-256 fingerprint over the canonical, non-secret inputs
 * that define "the same order request". Used only to detect an idempotency
 * key being reused for a genuinely different request — never logged, and
 * the canonical source string is discarded immediately after hashing.
 * Ported verbatim from the MasumDev masterclass source.
 */
export interface OrderFingerprintInput {
  batchId: string;
  registrationId: ObjectId;
  amount: number;
  currency: string;
}

export function computeOrderFingerprint(input: OrderFingerprintInput): string {
  const canonical = JSON.stringify({
    batchId: input.batchId,
    registrationId: input.registrationId.toHexString(),
    amount: input.amount,
    currency: input.currency,
  });
  return createHash("sha256").update(canonical).digest("hex");
}
