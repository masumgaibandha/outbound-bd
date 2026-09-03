import { NextResponse, type NextRequest } from "next/server";

import { getSecurityEnv, isRegistrationEnabled } from "@/lib/masterclass/env";
import { isPrivacyPolicyPublished } from "@/lib/masterclass/constants";
import { isRequestSameOrigin } from "@/lib/masterclass/origin-validation";
import { checkRateLimit } from "@/lib/masterclass/rate-limit";
import { registerForMasterclass } from "@/lib/masterclass/registration-service";
import { extractClientIp, extractClientUserAgent } from "@/lib/masterclass/request-context";
import { getAllowedTurnstileHostnames, validateTurnstileToken } from "@/lib/masterclass/turnstile";
import {
  idempotencyKeySchema,
  normalizeBangladeshPhone,
  registrationInputSchema,
  toValidationFailures,
} from "@/lib/masterclass/validation";

/*
 * The `mongodb` driver needs the Node.js runtime, not Edge. `force-dynamic`
 * keeps this route out of any static/ISR caching.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 10_000;
/** Same threshold as `/api/inquiries` — submissions faster than this are almost certainly scripted. */
const MIN_FILL_TIME_MS = 2500;

function noStoreJson(
  body: unknown,
  status: number,
  extraHeaders?: Record<string, string>,
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...extraHeaders },
  });
}

/*
 * Secure processing order, ported from the MasumDev masterclass source with
 * one addition (step 2 below: honeypot + timing gate, matching the
 * `/api/inquiries` convention already used elsewhere in this codebase — the
 * source didn't have a server-side check for this). Each step's failure
 * response is generic and never reveals *why* a request was rejected.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Registration/privacy/security configuration gate.
  const securityEnv = getSecurityEnv();
  if (!isRegistrationEnabled() || !isPrivacyPolicyPublished() || !securityEnv) {
    return noStoreJson({ error: "REGISTRATION_NOT_OPEN" }, 503);
  }

  // 2. Same-origin validation — no permissive CORS, no reflected origin.
  if (!isRequestSameOrigin(request.headers, securityEnv.allowedOrigins)) {
    return noStoreJson({ error: "REQUEST_NOT_ALLOWED" }, 403);
  }

  // 3. Trusted request-context extraction.
  const clientIpAddress = extractClientIp(request.headers);
  const clientUserAgent = extractClientUserAgent(request.headers);
  if (!clientIpAddress) {
    return noStoreJson({ error: "REQUEST_CONTEXT_UNAVAILABLE" }, 400);
  }

  // 4. IP rate-limit check.
  const ipRateLimit = await checkRateLimit({
    scope: "ip",
    subject: clientIpAddress,
    secret: securityEnv.rateLimitSecret,
  });
  if (!ipRateLimit.allowed) {
    return noStoreJson({ error: "RATE_LIMITED" }, 429, {
      "Retry-After": String(ipRateLimit.retryAfterSeconds),
    });
  }

  // 5. Body-size / content-type / idempotency-key header checks.
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return noStoreJson({ error: "UNSUPPORTED_MEDIA_TYPE" }, 415);
  }

  const idempotencyKeyResult = idempotencyKeySchema.safeParse(
    request.headers.get("idempotency-key") ?? "",
  );
  if (!idempotencyKeyResult.success) {
    return noStoreJson({ error: "INVALID_IDEMPOTENCY_KEY" }, 400);
  }

  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return noStoreJson({ error: "PAYLOAD_TOO_LARGE" }, 413);
  }

  // 6. JSON parsing and schema validation.
  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return noStoreJson({ error: "MALFORMED_JSON" }, 400);
  }

  const inputResult = registrationInputSchema.safeParse(parsedBody);
  if (!inputResult.success) {
    return noStoreJson(
      { error: "VALIDATION_ERROR", fields: toValidationFailures(inputResult.error) },
      422,
    );
  }

  /*
   * 7. Honeypot + timing gate (added in this port; not present in the
   * MasumDev source route — see `validation.ts`'s doc comment). A tripped
   * honeypot or a too-fast submission is reported as an ordinary success
   * without persisting anything, so a scripted submitter gets no signal
   * that it was caught — same convention as `/api/inquiries`.
   */
  const isHoneypotTripped = inputResult.data.honeypot.trim().length > 0;
  const isTooFast =
    typeof inputResult.data.startedAt === "number" &&
    Date.now() - inputResult.data.startedAt < MIN_FILL_TIME_MS;
  if (isHoneypotTripped || isTooFast) {
    return noStoreJson(
      { publicRegistrationRef: "", publicOrderRef: "", status: "PENDING" },
      201,
    );
  }

  const emailNormalized = inputResult.data.email.toLowerCase();
  const phoneE164 = normalizeBangladeshPhone(inputResult.data.phone);
  if (!phoneE164) {
    /* Unreachable in practice — the schema already checked this — but never trust a bypassed schema. */
    return noStoreJson(
      {
        error: "VALIDATION_ERROR",
        fields: [{ field: "phone", message: "Enter a valid Bangladeshi mobile number." }],
      },
      422,
    );
  }

  // 8. Turnstile Siteverify validation.
  const turnstileResult = await validateTurnstileToken({
    token: inputResult.data.turnstileToken,
    remoteIp: clientIpAddress,
    secretKey: securityEnv.turnstileSecretKey,
    allowedHostnames: getAllowedTurnstileHostnames(),
  });
  if (!turnstileResult.ok) {
    const status = turnstileResult.reason === "VERIFICATION_UNAVAILABLE" ? 503 : 403;
    return noStoreJson({ error: turnstileResult.reason }, status);
  }

  // 9. Normalized-email rate-limit check.
  const emailRateLimit = await checkRateLimit({
    scope: "email",
    subject: emailNormalized,
    secret: securityEnv.rateLimitSecret,
  });
  if (!emailRateLimit.allowed) {
    return noStoreJson({ error: "RATE_LIMITED" }, 429, {
      "Retry-After": String(emailRateLimit.retryAfterSeconds),
    });
  }

  // 10-11. Transactional registration/order service, then a sanitized response.
  try {
    const result = await registerForMasterclass({
      input: inputResult.data,
      emailNormalized,
      phoneE164,
      idempotencyKey: idempotencyKeyResult.data,
      clientIpAddress,
      clientUserAgent,
    });

    switch (result.kind) {
      case "ok":
        return noStoreJson(
          {
            publicRegistrationRef: result.publicRegistrationRef,
            publicOrderRef: result.publicOrderRef,
            status: result.status,
          },
          201,
        );
      case "registration_conflict":
        return noStoreJson({ error: "REGISTRATION_CONFLICT" }, 409);
      case "idempotency_conflict":
        return noStoreJson({ error: "IDEMPOTENCY_CONFLICT" }, 409);
    }
  } catch (error) {
    /* Safe to log: a message only, never the request body or a secret. */
    console.error(
      "[masterclass/registrations] Unexpected error:",
      error instanceof Error ? error.message : "unknown error",
    );
    return noStoreJson({ error: "INTERNAL_ERROR" }, 500);
  }
}
