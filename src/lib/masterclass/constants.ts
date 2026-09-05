/**
 * Authoritative, server-only masterclass facts. The browser must never be
 * trusted to supply price, currency, slug, or batch for a registration or
 * order — every persistence write reads these constants, never a
 * client-submitted value. (Distinct from `src/data/masterclass-content.ts`,
 * which is display copy for the UI, not a source of truth for writes.)
 * Ported from the MasumDev masterclass source — pricing, dates, and batch
 * identity preserved unchanged; only the canonical route and any
 * MasumDev-specific wording in comments were updated.
 */
export const masterclassSlug = "lead-generation-cold-email";
export const batchId = "lead-generation-cold-email-2026-10";
export const currency = "BDT";

/**
 * Batch 1 pricing. `earlyBirdEndsAt` is `null` by design — there is no
 * date-based cutoff, and the product deliberately never shows a countdown
 * for a deadline that doesn't exist. This batch's price (`earlyBirdPriceBDT`)
 * stays ৳1,499 until manually changed here for a future batch — it is never
 * automatically raised to `regularPriceBDT` by the passage of time. When a
 * real cutoff is decided for a future batch, set it here (and only here) and
 * `resolvePriceBDT()` starts honoring it automatically.
 */
export const earlyBirdPriceBDT = 1499;
export const regularPriceBDT = 2499;
export const earlyBirdEndsAt: Date | null = null;

/** No hard registration cutoff yet — `null` means registration stays open until manually disabled. */
export const registrationEndsAt: Date | null = null;

/**
 * Both live-class sessions, for copy and (later) any date-gated logic. The
 * single source of truth for the batch's dates — every displayed date
 * string (Bengali copy, the OG-image card, legal content) is derived from
 * this via `formatClassDatesBn()`/`formatClassDatesEn()` in `format.ts`,
 * never re-typed. Always written with an explicit `+06:00` (`Asia/Dhaka`)
 * offset — the class's own timezone — so the stored instant is correct
 * regardless of the server's local timezone.
 */
export const classDates = {
  day1: new Date("2026-10-23T21:00:00+06:00"),
  day2: new Date("2026-10-24T21:00:00+06:00"),
} as const;

/**
 * The one place "what does this student pay right now" is decided. Every
 * order stores the number this returns *at order-creation time* — never
 * recomputed later from whatever the current price happens to be.
 */
export function resolvePriceBDT(now: Date = new Date()): number {
  if (earlyBirdEndsAt && now >= earlyBirdEndsAt) return regularPriceBDT;
  return earlyBirdPriceBDT;
}

/**
 * One centralized, immutable version per legal document. Bump the relevant
 * date whenever that document's *content* materially changes — every new
 * registration's consent evidence stamps the version in effect at the
 * moment of acceptance (see `ConsentRecord`), so a later bump never
 * rewrites what an earlier student actually agreed to. Bengali page content
 * lives in `src/data/legal-content.ts` — this object is the only place a
 * version string is defined; the client must never be trusted to supply
 * one.
 */
export const policyVersions = {
  privacy: "2026-08-18",
  /* Bumped 2026-09-03: the Terms' "Course Details" section restates classDates (now Oct 23-24). */
  terms: "2026-09-03",
  refund: "2026-08-09",
} as const;

const UNPUBLISHED_PRIVACY_VERSION = "unpublished-draft";

/**
 * `false` until a real privacy policy is published and `policyVersions.privacy`
 * is bumped past the placeholder. The registration route fails closed on
 * this even if `MASTERCLASS_REGISTRATION_ENABLED` is accidentally set to
 * `"true"` — accepting consent for a policy that doesn't exist yet isn't a
 * recoverable mistake after the fact.
 */
export function isPrivacyPolicyPublished(): boolean {
  const currentPrivacyVersion: string = policyVersions.privacy;
  return currentPrivacyVersion !== UNPUBLISHED_PRIVACY_VERSION;
}
