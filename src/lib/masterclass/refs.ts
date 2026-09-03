import { randomUUID } from "node:crypto";

/**
 * Unpredictable public identifier, safe to return to the browser and put in
 * a URL. Never a MongoDB `_id` (ObjectIds are sequential-ish and leak
 * creation order) and never derived from email/phone/time. Registrations
 * use a different, human-friendly ref instead (`MC-2026-000123` — see
 * `generateHumanRegistrationRef()` in `counters-repository.ts`); orders
 * stay an internal, opaque `ord_<uuid>`. Ported verbatim from the MasumDev
 * masterclass source.
 */
export function generatePublicOrderRef(): string {
  return `ord_${randomUUID()}`;
}
