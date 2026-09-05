import "server-only";

import { isPrivacyPolicyPublished } from "@/lib/masterclass/constants";

/**
 * Server-only environment accessors for the masterclass feature, kept
 * separate from `src/lib/env.ts` (MONGODB_URI only) and `public-env.ts` —
 * same separation-of-concerns rationale as the rest of this codebase: a
 * misconfigured masterclass variable must never fail a build or a request
 * for a route that doesn't touch the masterclass at all. Every function
 * reads `process.env` lazily, only when called — importing this file never
 * throws and never touches MongoDB or a secret by itself.
 *
 * Ported from the MasumDev masterclass source (read-only reference) with
 * deliberate changes documented inline where this file's behavior differs.
 */

/** The literal string "true" — anything else (including unset) means disabled. */
export function isRegistrationEnabled(): boolean {
  return process.env.MASTERCLASS_REGISTRATION_ENABLED === "true";
}

/**
 * Cloudflare's two official, publicly documented test secret keys. Valid
 * for local/automated testing only — Cloudflare's Siteverify endpoint
 * always accepts (or always rejects, for the second) tokens produced
 * against these, regardless of the actual visitor. A production deploy
 * configured with either one would silently accept every bot submission.
 * See https://developers.cloudflare.com/turnstile/troubleshooting/testing/
 */
const CLOUDFLARE_TEST_SECRET_KEYS = new Set([
  "1x0000000000000000000000000000000AA", // always passes
  "2x0000000000000000000000000000000AA", // always fails
  "3x0000000000000000000000000000000AA", // always fails (token already spent)
]);

const CLOUDFLARE_TEST_SITE_KEYS = new Set([
  "1x00000000000000000000AA", // always passes (visible, interactive)
  "2x00000000000000000000AB", // always blocks
  "3x00000000000000000000FF", // forces an error
]);

export interface SecurityEnv {
  turnstileSecretKey: string;
  rateLimitSecret: string;
  /** Raw, parsed `MASTERCLASS_ALLOWED_ORIGINS` list — no localhost filtering applied here; see `origin-validation.ts`. */
  allowedOrigins: readonly string[];
}

function parseAllowedOrigins(raw: string): string[] {
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

/** `null` if `MASTERCLASS_ALLOWED_ORIGINS` is missing or empty. Shared by the registration security env below and by `getAdminSecurityEnv()`. */
export function getAllowedOrigins(): readonly string[] | null {
  const raw = process.env.MASTERCLASS_ALLOWED_ORIGINS;
  if (!raw) return null;
  const parsed = parseAllowedOrigins(raw);
  return parsed.length > 0 ? parsed : null;
}

/**
 * `null` if Turnstile, rate-limit, or origin-allowlist configuration is
 * missing or empty, OR — new in this port, not present in the MasumDev
 * source — if `NODE_ENV === "production"` and either Turnstile key is one
 * of Cloudflare's well-known test values. That second check is the
 * "production must reject startup/deployment if the official test keys are
 * configured" requirement: it can't literally fail the build (Vercel builds
 * don't always have runtime env available the same way), so it fails
 * closed at request time instead — every registration/payment route
 * treats a `null` here exactly like `isRegistrationEnabled() === false`, a
 * generic `503 REGISTRATION_NOT_OPEN`, before anything else runs. A
 * production deploy accidentally left on test keys can never accept a real
 * submission; it just looks disabled from the outside.
 */
export function getSecurityEnv(): SecurityEnv | null {
  const turnstileSecretKey = process.env.TURNSTILE_SECRET_KEY;
  const rateLimitSecret = process.env.MASTERCLASS_RATE_LIMIT_SECRET;
  const rawAllowedOrigins = process.env.MASTERCLASS_ALLOWED_ORIGINS;

  if (!turnstileSecretKey || !rateLimitSecret || !rawAllowedOrigins) {
    return null;
  }

  if (process.env.NODE_ENV === "production") {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (
      CLOUDFLARE_TEST_SECRET_KEYS.has(turnstileSecretKey) ||
      (siteKey && CLOUDFLARE_TEST_SITE_KEYS.has(siteKey))
    ) {
      return null;
    }
  }

  const allowedOrigins = parseAllowedOrigins(rawAllowedOrigins);
  if (allowedOrigins.length === 0) {
    return null;
  }

  return { turnstileSecretKey, rateLimitSecret, allowedOrigins };
}

export interface AdminSecurityEnv {
  rateLimitSecret: string;
  allowedOrigins: readonly string[];
}

/**
 * Deliberately decoupled from `getSecurityEnv()` — that function returns
 * `null` (among other reasons) when Turnstile is misconfigured or left on
 * Cloudflare's test keys, but the admin order-review surface must keep
 * working even then (an operator may still need to approve/reject leftover
 * payment orders while registration itself is closed). Only needs the
 * rate-limit secret (for `requireMasterclassAdmin()`'s failed-attempt
 * limiter) and the origin allowlist (for the admin Server Actions' explicit
 * same-origin check) — never Turnstile config.
 */
export function getAdminSecurityEnv(): AdminSecurityEnv | null {
  const rateLimitSecret = process.env.MASTERCLASS_RATE_LIMIT_SECRET;
  const allowedOrigins = getAllowedOrigins();
  if (!rateLimitSecret || !allowedOrigins) return null;
  return { rateLimitSecret, allowedOrigins };
}

/** True only outside production — lets tests and local QA use Cloudflare's test keys without the production guard above rejecting them. */
export function isUsingCloudflareTestKeys(): boolean {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  return (
    (!!secretKey && CLOUDFLARE_TEST_SECRET_KEYS.has(secretKey)) ||
    (!!siteKey && CLOUDFLARE_TEST_SITE_KEYS.has(siteKey))
  );
}

export interface ManualPaymentMethodEnv {
  enabled: boolean;
  number: string | null;
}

/**
 * All five fields are required together — a Bangladeshi bank transfer's
 * manual-verification instructions need the bank name, account name, account
 * number, branch, and routing number to be unambiguous for a student sending
 * money and for an operator reconciling it. `enabled` is only ever true when
 * every one of the five is set; a partially-configured bank never leaks a
 * subset of its own details to the browser (see `getManualPaymentEnv()`
 * below) — it simply stays hidden, exactly like an unconfigured
 * bKash/Nagad/Rocket number.
 */
export interface ManualPaymentBankEnv {
  enabled: boolean;
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  branch: string | null;
  routingNumber: string | null;
}

export interface ManualPaymentEnv {
  bkash: ManualPaymentMethodEnv;
  nagad: ManualPaymentMethodEnv;
  rocket: ManualPaymentMethodEnv;
  bank: ManualPaymentBankEnv;
}

/**
 * Per-method: `enabled` only when its payment number is actually configured.
 * Never throws — an unconfigured method is simply hidden from the payment
 * picker rather than presenting a broken flow. The bank channel follows the
 * same "hide, never half-show" rule but requires all five of its own
 * variables together (see `ManualPaymentBankEnv`'s doc comment) — missing any
 * one of them hides only the bank option, never bKash/Nagad/Rocket.
 */
export function getManualPaymentEnv(): ManualPaymentEnv {
  const bkash = process.env.MASTERCLASS_BKASH_NUMBER?.trim() || null;
  const nagad = process.env.MASTERCLASS_NAGAD_NUMBER?.trim() || null;
  const rocket = process.env.MASTERCLASS_ROCKET_NUMBER?.trim() || null;

  const bankName = process.env.MASTERCLASS_BANK_NAME?.trim() || null;
  const bankAccountName = process.env.MASTERCLASS_BANK_ACCOUNT_NAME?.trim() || null;
  const bankAccountNumber = process.env.MASTERCLASS_BANK_ACCOUNT_NUMBER?.trim() || null;
  const bankBranch = process.env.MASTERCLASS_BANK_BRANCH?.trim() || null;
  const bankRoutingNumber = process.env.MASTERCLASS_BANK_ROUTING_NUMBER?.trim() || null;
  const bankComplete = Boolean(
    bankName && bankAccountName && bankAccountNumber && bankBranch && bankRoutingNumber,
  );

  return {
    bkash: { enabled: bkash !== null, number: bkash },
    nagad: { enabled: nagad !== null, number: nagad },
    rocket: { enabled: rocket !== null, number: rocket },
    bank: {
      enabled: bankComplete,
      bankName: bankComplete ? bankName : null,
      accountName: bankComplete ? bankAccountName : null,
      accountNumber: bankComplete ? bankAccountNumber : null,
      branch: bankComplete ? bankBranch : null,
      routingNumber: bankComplete ? bankRoutingNumber : null,
    },
  };
}

/**
 * The single place that decides which manual methods actually show up in the
 * payment picker — pure function of `ManualPaymentEnv`, so it's testable
 * without touching `process.env` and reusable by both the registration form
 * and its tests. Order is deliberate (mobile wallets first, bank last).
 */
export function listEnabledManualPaymentMethods(
  paymentMethods: ManualPaymentEnv,
): ("BKASH" | "NAGAD" | "ROCKET" | "BANK")[] {
  const methods: ("BKASH" | "NAGAD" | "ROCKET" | "BANK")[] = [];
  if (paymentMethods.bkash.enabled) methods.push("BKASH");
  if (paymentMethods.nagad.enabled) methods.push("NAGAD");
  if (paymentMethods.rocket.enabled) methods.push("ROCKET");
  if (paymentMethods.bank.enabled) methods.push("BANK");
  return methods;
}

export interface AdminAuthEnv {
  username: string;
  password: string;
}

/** `null` if either credential is missing — the admin route fails closed, never with a default credential. */
export function getAdminAuthEnv(): AdminAuthEnv | null {
  const username = process.env.MASTERCLASS_ADMIN_USER;
  const password = process.env.MASTERCLASS_ADMIN_PASSWORD;
  if (!username || !password) return null;
  return { username, password };
}

export interface MetaEnv {
  pixelId: string;
  capiAccessToken: string;
}

/**
 * Server-side Conversions API config — `null` if either half is missing.
 * Distinct from `NEXT_PUBLIC_META_PIXEL_ID` (the browser Pixel ID, public by
 * design); `capiAccessToken` must never reach a Client Component. The
 * caller is also responsible for checking `NEXT_PUBLIC_META_PIXEL_ID` and
 * `META_PIXEL_ID` actually match (see `verifyMetaPixelIdsMatch()` below) —
 * a mismatch is a configuration bug, not something this function silently
 * papers over.
 */
export function getMetaCapiEnv(): MetaEnv | null {
  const pixelId = process.env.META_PIXEL_ID;
  const capiAccessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!pixelId || !capiAccessToken) return null;
  return { pixelId, capiAccessToken };
}

/** Browser Pixel ID and server Pixel ID must match — a mismatch means events would be attributed to the wrong Pixel, or CAPI would silently no-op against a Pixel the browser never touched. */
export function verifyMetaPixelIdsMatch(): boolean {
  const clientPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const serverPixelId = process.env.META_PIXEL_ID;
  if (!clientPixelId || !serverPixelId) return true; // nothing to mismatch if either is absent
  return clientPixelId === serverPixelId;
}

/**
 * The full server-controlled readiness gate for the registration form —
 * deliberately a single boolean, never the underlying reasons. True only
 * when all three hold: `MASTERCLASS_REGISTRATION_ENABLED`, a published
 * privacy policy (not the placeholder), and complete
 * Turnstile/rate-limit/origin security configuration (including the
 * production test-key guard above).
 */
export function isRegistrationOperationallyReady(): boolean {
  return isRegistrationEnabled() && isPrivacyPolicyPublished() && getSecurityEnv() !== null;
}
