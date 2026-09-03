import { randomUUID } from "node:crypto";

import { isUsingCloudflareTestKeys } from "@/lib/masterclass/env";

/**
 * Server-only Cloudflare Turnstile validation. Never imported by a Client
 * Component — `TURNSTILE_SECRET_KEY` only ever exists in this file's
 * `process.env` read. Never logs the token, the raw Cloudflare response, or
 * an `error-codes` array; never persists the token anywhere. Ported from
 * the MasumDev masterclass source with one change: hostnames below are
 * `outboundbd.com`/`www.outboundbd.com` instead of `masumdev.com` (this is
 * a different site now). The "reject official test keys in production"
 * safeguard lives in `src/lib/masterclass/env.ts` (`getSecurityEnv()`), not
 * here — this module just verifies whatever secret key it's handed.
 */

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const REQUEST_TIMEOUT_MS = 5000;
const MAX_ATTEMPTS = 2;
const EXPECTED_ACTION = "masterclass_registration";

export type TurnstileFailureReason = "BOT_VERIFICATION_FAILED" | "VERIFICATION_UNAVAILABLE";

export type TurnstileValidationResult =
  | { ok: true }
  | { ok: false; reason: TurnstileFailureReason };

export interface TurnstileValidationInput {
  token: string;
  /** Already-validated, syntactically-checked client IP — passed straight through, never re-derived here. */
  remoteIp: string | null;
  secretKey: string;
  allowedHostnames: readonly string[];
}

interface SiteverifyResponse {
  success?: unknown;
  action?: unknown;
  hostname?: unknown;
}

/**
 * Production only ever allows the real apex/www hostnames; non-production
 * also allows `localhost` for local testing.
 *
 * When the configured keys are Cloudflare's own official test keypair
 * (`isUsingCloudflareTestKeys()`, from `env.ts` — already restricted to
 * non-production by `getSecurityEnv()`'s own guard), `example.com` is also
 * allowed: Cloudflare's Siteverify response for those specific test keys
 * always reports `hostname: "example.com"` regardless of the page's real
 * origin — that's a fixed, documented artifact of the test keypair, not a
 * value this app's pages ever actually serve from. Without this, no
 * automated or manual local test using the official test keys could ever
 * pass verification, contradicting the explicit requirement that local
 * tests may use them. A real Turnstile key/token never reports this
 * hostname, so this never widens acceptance for genuine production traffic.
 */
export function getAllowedTurnstileHostnames(): string[] {
  const base =
    process.env.NODE_ENV === "production"
      ? ["outboundbd.com", "www.outboundbd.com"]
      : ["outboundbd.com", "www.outboundbd.com", "localhost"];

  if (process.env.NODE_ENV !== "production" && isUsingCloudflareTestKeys()) {
    return [...base, "example.com"];
  }
  return base;
}

async function callSiteverify(body: URLSearchParams): Promise<SiteverifyResponse | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const json: unknown = await response.json();
    if (typeof json !== "object" || json === null) return null;
    return json as SiteverifyResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * At most two Siteverify attempts, reusing the same generated
 * `idempotency_key` across both — Cloudflare's documented mechanism for a
 * safe retry.
 */
export async function validateTurnstileToken(
  input: TurnstileValidationInput,
): Promise<TurnstileValidationResult> {
  const idempotencyKey = randomUUID();
  const params = new URLSearchParams();
  params.set("secret", input.secretKey);
  params.set("response", input.token);
  if (input.remoteIp) params.set("remoteip", input.remoteIp);
  params.set("idempotency_key", idempotencyKey);

  let response: SiteverifyResponse | null = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS && response === null; attempt++) {
    response = await callSiteverify(params);
  }

  if (response === null) {
    return { ok: false, reason: "VERIFICATION_UNAVAILABLE" };
  }

  if (response.success !== true) {
    return { ok: false, reason: "BOT_VERIFICATION_FAILED" };
  }

  /*
   * Cloudflare's official test keys never echo back an `action` in their
   * Siteverify response at all (confirmed empirically: the response body
   * for a test-key token has no `action` field, only
   * success/error-codes/challenge_ts/hostname/metadata) — a real token
   * always does. Skipping this check for test keys (non-production only,
   * same guard as the hostname widening below) is required for local/
   * automated testing with the official test keys to ever pass; it never
   * loosens verification for a genuine token in production.
   */
  const usingTestKeys = process.env.NODE_ENV !== "production" && isUsingCloudflareTestKeys();
  if (!usingTestKeys && (typeof response.action !== "string" || response.action !== EXPECTED_ACTION)) {
    return { ok: false, reason: "BOT_VERIFICATION_FAILED" };
  }

  if (
    typeof response.hostname !== "string" ||
    !input.allowedHostnames.includes(response.hostname)
  ) {
    return { ok: false, reason: "BOT_VERIFICATION_FAILED" };
  }

  return { ok: true };
}
