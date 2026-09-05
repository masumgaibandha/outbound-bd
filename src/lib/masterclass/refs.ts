import { randomInt, randomUUID } from "node:crypto";

/**
 * Unpredictable public identifier, safe to return to the browser and put in
 * a URL. Never a MongoDB `_id` (ObjectIds are sequential-ish and leak
 * creation order) and never derived from email/phone/time. Registrations
 * use a different, human-friendly ref instead (`MC-2026-K7M4Q9P2` — see
 * `generateRandomRegistrationRef()` below); orders stay an internal, opaque
 * `ord_<uuid>`. Ported verbatim from the MasumDev masterclass source.
 */
export function generatePublicOrderRef(): string {
  return `ord_${randomUUID()}`;
}

/**
 * 31-character alphabet for random registration-reference suffixes:
 * uppercase A–Z and digits 2–9, excluding `0`/`O`, `1`/`I`, and `L` — visually
 * ambiguous in many fonts and easy to mistype when a student reads one aloud
 * over phone/WhatsApp support. Digits/letters only, no extra symbols (the
 * fixed hyphens in the ref are already enough structure — more symbols only
 * create URL-encoding, copy-paste, and validation friction).
 */
/** Exported so `student-refs.ts` can reuse the exact same unambiguous set for `STU-` IDs — one alphabet, never a second copy that could drift. */
export const REGISTRATION_REF_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const REGISTRATION_REF_RANDOM_LENGTH = 8;

/**
 * Legacy zero-padded sequential suffix (`000123`, from before this change —
 * see `formatRegistrationRef()`/`generateHumanRegistrationRef()` in
 * `counters-repository.ts`, kept but no longer called for new registrations)
 * or the new random suffix (`K7M4Q9P2`). Existing documents are never
 * rewritten, so any code that recognizes a registration reference's shape —
 * today, nothing in this app parses it; `findRegistrationByPublicRef()` is a
 * plain exact-string lookup — must keep accepting both indefinitely.
 */
export const REGISTRATION_REF_PATTERN = /^MC-\d{4}-(?:\d{6}|[23456789A-HJ-NP-Z]{8})$/;

/** `true` only for the new random suffix shape (8 chars from `REGISTRATION_REF_ALPHABET`), never the legacy 6-digit one. */
export const RANDOM_REGISTRATION_REF_PATTERN = /^MC-\d{4}-[23456789A-HJ-NP-Z]{8}$/;

/**
 * Cryptographically random 8-character suffix — `node:crypto`'s `randomInt`
 * (never `Math.random()`), which is both CSPRNG-backed and unbiased (no
 * modulo-bias correction needed, unlike hand-rolling this from
 * `randomBytes`). Never derived from a count, timestamp, email, phone, or
 * MongoDB ObjectId — two calls in the same millisecond for two different
 * students produce unrelated output.
 */
function randomRegistrationSuffix(): string {
  let suffix = "";
  for (let i = 0; i < REGISTRATION_REF_RANDOM_LENGTH; i++) {
    suffix += REGISTRATION_REF_ALPHABET[randomInt(REGISTRATION_REF_ALPHABET.length)];
  }
  return suffix;
}

/**
 * New public registration reference format: `MC-<year>-<8 random chars>`
 * (e.g. `MC-2026-K7M4Q9P2`). Unlike the retired sequential format, this
 * reveals nothing about registration volume or order — two consecutively
 * created registrations get unrelated-looking refs. This function does not
 * itself guarantee uniqueness; the DB's `uniq_public_registration_ref` index
 * is the actual guarantee, and `upsertRegistration()` in
 * `registrations-repository.ts` retries (bounded) on the astronomically
 * unlikely collision.
 */
export function generateRandomRegistrationRef(year: number): string {
  return `MC-${year}-${randomRegistrationSuffix()}`;
}
