import { NextResponse, type NextRequest } from "next/server";

import { getSecurityEnv, isRegistrationOperationallyReady } from "@/lib/masterclass/env";
import { DuplicateTransactionError, OrderNotEditableError } from "@/lib/masterclass/errors";
import { isRequestSameOrigin } from "@/lib/masterclass/origin-validation";
import {
  findOrderByPublicRef,
  submitManualPayment,
} from "@/lib/masterclass/payment-orders-repository";
import { checkRateLimit } from "@/lib/masterclass/rate-limit";
import { extractClientIp } from "@/lib/masterclass/request-context";
import { manualPaymentInputSchema, normalizeBangladeshPhone } from "@/lib/masterclass/validation";

/** Ported verbatim from the MasumDev masterclass source. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 2_000;

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

/**
 * Step 2 of registration: the student chooses bKash/Nagad/Rocket and submits
 * their sender number + transaction ID. This only ever moves an order to
 * `REVIEW` — it can never set `PAID` itself. The order's own unguessable
 * `publicOrderRef` (from the registration response) acts as the request's
 * bearer capability, so no second Turnstile challenge is required.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ publicOrderRef: string }> },
): Promise<NextResponse> {
  const securityEnv = getSecurityEnv();
  if (!isRegistrationOperationallyReady() || !securityEnv) {
    return noStoreJson({ error: "REGISTRATION_NOT_OPEN" }, 503);
  }

  if (!isRequestSameOrigin(request.headers, securityEnv.allowedOrigins)) {
    return noStoreJson({ error: "REQUEST_NOT_ALLOWED" }, 403);
  }

  const clientIpAddress = extractClientIp(request.headers);
  if (!clientIpAddress) {
    return noStoreJson({ error: "REQUEST_CONTEXT_UNAVAILABLE" }, 400);
  }

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

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return noStoreJson({ error: "UNSUPPORTED_MEDIA_TYPE" }, 415);
  }

  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return noStoreJson({ error: "PAYLOAD_TOO_LARGE" }, 413);
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return noStoreJson({ error: "MALFORMED_JSON" }, 400);
  }

  const inputResult = manualPaymentInputSchema.safeParse(parsedBody);
  if (!inputResult.success) {
    return noStoreJson(
      {
        error: "VALIDATION_ERROR",
        fields: inputResult.error.issues.map((issue) => ({
          field: issue.path.join(".") || "(root)",
          message: issue.message,
        })),
      },
      422,
    );
  }

  const senderNumberE164 = normalizeBangladeshPhone(inputResult.data.senderNumber);
  if (!senderNumberE164) {
    return noStoreJson(
      { error: "VALIDATION_ERROR", fields: [{ field: "senderNumber", message: "Enter a valid Bangladeshi mobile number." }] },
      422,
    );
  }

  const { publicOrderRef } = await context.params;
  const existingOrder = await findOrderByPublicRef(publicOrderRef);
  if (!existingOrder) {
    return noStoreJson({ error: "ORDER_NOT_FOUND" }, 404);
  }

  try {
    const updated = await submitManualPayment({
      publicOrderRef,
      method: inputResult.data.method,
      senderNumber: senderNumberE164,
      transactionIdRaw: inputResult.data.transactionId,
    });

    return noStoreJson({ publicOrderRef: updated.publicOrderRef, status: updated.status }, 200);
  } catch (error) {
    if (error instanceof DuplicateTransactionError) {
      return noStoreJson({ error: "DUPLICATE_TRANSACTION_ID" }, 409);
    }
    if (error instanceof OrderNotEditableError) {
      return noStoreJson({ error: "ORDER_NOT_EDITABLE" }, 409);
    }
    console.error(
      "[masterclass/registrations/payment] Unexpected error:",
      error instanceof Error ? error.message : "unknown error",
    );
    return noStoreJson({ error: "INTERNAL_ERROR" }, 500);
  }
}
