// Must be the first import — sets MONGODB_URI to an isolated single-node
// replica set (transaction support isn't needed here, but this mirrors the
// rest of the masterclass suite's import-order convention and keeps every
// masterclass test file pointed at the same kind of isolated instance) before
// env.ts / mongoose.ts / admin-auth.ts / actions.ts are imported.
import { mongod } from "../helpers/mongodb-memory-replset";

import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const headersMock = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({ headers: headersMock }));

// `revalidatePath` requires a live Next.js request-handling/static-generation
// store that doesn't exist when a Server Action is invoked directly from a
// test — stub it to a no-op rather than pulling in Next's runtime machinery.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const sendMock = vi.hoisted(() => vi.fn());
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

import { connectToDatabase } from "@/lib/mongoose";
import * as constants from "@/lib/masterclass/constants";
import {
  createDraftOrder,
  findOrderByPublicRef,
  PAYMENT_ORDERS_COLLECTION,
  submitManualPayment,
} from "@/lib/masterclass/payment-orders-repository";
import {
  REGISTRATIONS_COLLECTION,
  upsertRegistration,
} from "@/lib/masterclass/registrations-repository";
import { COUNTERS_COLLECTION } from "@/lib/masterclass/counters-repository";
import { RATE_LIMIT_COLLECTION } from "@/lib/masterclass/rate-limit";
import {
  approveOrderAction,
  rejectOrderAction,
  retryDeliveryAction,
} from "@/app/masterclass/admin/orders/actions";

const ADMIN_USER = "qa-admin";
const ADMIN_PASSWORD = "qa-correct-horse-battery-staple";
const ALLOWED_ORIGIN = "https://outboundbd.com";

function basicAuthHeader(user: string, password: string): string {
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

function mockRequestHeaders(opts: {
  authorization?: string | null;
  origin?: string | null;
  secFetchSite?: string | null;
  ip?: string;
} = {}) {
  const {
    authorization = basicAuthHeader(ADMIN_USER, ADMIN_PASSWORD),
    origin = ALLOWED_ORIGIN,
    secFetchSite = "same-origin",
    ip = "203.0.113.9",
  } = opts;
  const map = new Map<string, string>();
  if (authorization !== null) map.set("authorization", authorization);
  if (origin !== null) map.set("origin", origin);
  if (secFetchSite !== null) map.set("sec-fetch-site", secFetchSite);
  map.set("x-forwarded-for", ip);
  headersMock.mockResolvedValue({ get: (key: string) => map.get(key.toLowerCase()) ?? null });
}

async function seedOrderInReview() {
  const email = `student-${randomUUID()}@example.com`;
  const registration = await upsertRegistration({
    masterclassSlug: constants.masterclassSlug,
    batchId: constants.batchId,
    name: "Test Student",
    email,
    emailNormalized: email,
    phone: "01712345678",
    phoneE164: "+8801712345678",
    marketingConsent: false,
    attribution: { capturedAt: new Date() },
  });
  const { order } = await createDraftOrder({
    registrationId: registration._id!,
    masterclassSlug: constants.masterclassSlug,
    batchId: constants.batchId,
    amount: constants.resolvePriceBDT(),
    currency: constants.currency,
    idempotencyKey: randomUUID(),
    attribution: { capturedAt: new Date() },
    clientIpAddress: null,
    clientUserAgent: null,
  });
  await submitManualPayment({
    publicOrderRef: order.publicOrderRef,
    method: "BKASH",
    senderNumber: "+8801712345678",
    transactionIdRaw: `TXN-${randomUUID()}`,
  });
  return order.publicOrderRef;
}

beforeAll(async () => {
  await connectToDatabase();
});

beforeEach(async () => {
  const connection = await connectToDatabase();
  const db = connection.connection.db!;
  await Promise.all([
    db.collection(REGISTRATIONS_COLLECTION).deleteMany({}),
    db.collection(PAYMENT_ORDERS_COLLECTION).deleteMany({}),
    db.collection(COUNTERS_COLLECTION).deleteMany({}),
    db.collection(RATE_LIMIT_COLLECTION).deleteMany({}),
  ]);
  sendMock.mockReset();
  sendMock.mockResolvedValue({ data: { id: "email_1" }, error: null });
  vi.unstubAllEnvs();
  vi.stubEnv("MASTERCLASS_ADMIN_USER", ADMIN_USER);
  vi.stubEnv("MASTERCLASS_ADMIN_PASSWORD", ADMIN_PASSWORD);
  vi.stubEnv("MASTERCLASS_RATE_LIMIT_SECRET", "qa-rate-limit-secret");
  vi.stubEnv("MASTERCLASS_ALLOWED_ORIGINS", ALLOWED_ORIGIN);
  vi.stubEnv("RESEND_API_KEY", "test-resend-key");
  vi.stubEnv("RESEND_FROM_EMAIL", "Outbound BD <hello@outboundbd.com>");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", ALLOWED_ORIGIN);
  vi.stubGlobal("fetch", vi.fn());
  mockRequestHeaders();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  headersMock.mockReset();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("approveOrderAction — auth/origin guarding", () => {
  it("rejects with missing credentials, no mutation occurs", async () => {
    const publicOrderRef = await seedOrderInReview();
    mockRequestHeaders({ authorization: null });

    const result = await approveOrderAction(publicOrderRef);
    expect(result.ok).toBe(false);
    expect(result.message).toBe("Not authorized.");

    const order = await findOrderByPublicRef(publicOrderRef);
    expect(order?.status).toBe("REVIEW");
  });

  it("rejects with incorrect credentials, no mutation occurs", async () => {
    const publicOrderRef = await seedOrderInReview();
    mockRequestHeaders({ authorization: basicAuthHeader(ADMIN_USER, "wrong-password") });

    const result = await approveOrderAction(publicOrderRef);
    expect(result.ok).toBe(false);

    const order = await findOrderByPublicRef(publicOrderRef);
    expect(order?.status).toBe("REVIEW");
  });

  it("succeeds with correct credentials", async () => {
    const publicOrderRef = await seedOrderInReview();
    mockRequestHeaders();

    const result = await approveOrderAction(publicOrderRef);
    expect(result.ok).toBe(true);

    const order = await findOrderByPublicRef(publicOrderRef);
    expect(order?.status).toBe("PAID");
  });

  it("rejects a mismatched-origin request even with correct credentials — no mutation occurs", async () => {
    const publicOrderRef = await seedOrderInReview();
    mockRequestHeaders({ origin: "https://evil-attacker.example" });

    const result = await approveOrderAction(publicOrderRef);
    expect(result.ok).toBe(false);
    expect(result.message).toBe("Not authorized.");

    const order = await findOrderByPublicRef(publicOrderRef);
    expect(order?.status).toBe("REVIEW"); // blocked cross-origin mutation never took effect
  });

  it("rejects a missing Origin header", async () => {
    const publicOrderRef = await seedOrderInReview();
    mockRequestHeaders({ origin: null });

    const result = await approveOrderAction(publicOrderRef);
    expect(result.ok).toBe(false);

    const order = await findOrderByPublicRef(publicOrderRef);
    expect(order?.status).toBe("REVIEW");
  });

  it("rate-limits repeated calls from the same IP — the 21st call is rejected even with correct credentials", async () => {
    const publicOrderRef = await seedOrderInReview();
    const ip = "198.51.100.201";
    let lastResult: Awaited<ReturnType<typeof approveOrderAction>> | undefined;
    for (let i = 0; i < 21; i++) {
      mockRequestHeaders({ ip });
      lastResult = await approveOrderAction(`ord_nonexistent-probe-${i}`);
    }
    expect(lastResult?.ok).toBe(false);
    expect(lastResult?.message).toBe("Not authorized.");

    // The real order was never touched by any of the probe calls above.
    const order = await findOrderByPublicRef(publicOrderRef);
    expect(order?.status).toBe("REVIEW");
  }, 30_000);
});

describe("approveOrderAction — not found / invalid state transition", () => {
  it("returns a clean not-found result for a ref that doesn't exist, without throwing", async () => {
    mockRequestHeaders();
    const result = await approveOrderAction("ord_does-not-exist");
    expect(result.ok).toBe(false);
    expect(result.message).toBe("Order not found.");
  });

  it("refuses to re-approve an order that is already PAID (invalid state transition)", async () => {
    const publicOrderRef = await seedOrderInReview();
    mockRequestHeaders();

    const first = await approveOrderAction(publicOrderRef);
    expect(first.ok).toBe(true);

    const second = await approveOrderAction(publicOrderRef);
    expect(second.ok).toBe(false);
    expect(second.message).toBe("This order was already processed — it's no longer in REVIEW.");
  });

  it("refuses to approve an order that was already REJECTED", async () => {
    const publicOrderRef = await seedOrderInReview();
    mockRequestHeaders();

    const rejected = await rejectOrderAction(publicOrderRef, "not verifiable");
    expect(rejected.ok).toBe(true);

    const approveAttempt = await approveOrderAction(publicOrderRef);
    expect(approveAttempt.ok).toBe(false);

    const order = await findOrderByPublicRef(publicOrderRef);
    expect(order?.status).toBe("REJECTED"); // never silently flipped to PAID
  });
});

describe("approveOrderAction — approval, idempotency, and the atomic double-approval race", () => {
  it("moves REVIEW -> PAID and records reviewer/audit fields", async () => {
    const publicOrderRef = await seedOrderInReview();
    mockRequestHeaders();

    const result = await approveOrderAction(publicOrderRef);
    expect(result.ok).toBe(true);

    const order = await findOrderByPublicRef(publicOrderRef);
    expect(order?.status).toBe("PAID");
    expect(order?.verifiedBy).toBe(ADMIN_USER);
    expect(order?.verifiedAt).toBeInstanceOf(Date);
  });

  it("is idempotent: calling approve twice sequentially is safe and never surfaces as a crash", async () => {
    const publicOrderRef = await seedOrderInReview();
    mockRequestHeaders();

    const first = await approveOrderAction(publicOrderRef);
    expect(first.ok).toBe(true);
    const firstVerifiedAt = (await findOrderByPublicRef(publicOrderRef))?.verifiedAt;

    const second = await approveOrderAction(publicOrderRef);
    expect(second.ok).toBe(false);
    expect(second.message).toBe("This order was already processed — it's no longer in REVIEW.");

    const order = await findOrderByPublicRef(publicOrderRef);
    expect(order?.status).toBe("PAID");
    expect(order?.verifiedAt).toEqual(firstVerifiedAt); // untouched by the second call
    expect(sendMock).toHaveBeenCalledTimes(1); // no duplicate confirmation email from the no-op retry
  });

  it("under two concurrent approval calls for the same order, exactly one succeeds and the order is never corrupted", async () => {
    const publicOrderRef = await seedOrderInReview();
    mockRequestHeaders();

    const [a, b] = await Promise.all([
      approveOrderAction(publicOrderRef),
      approveOrderAction(publicOrderRef),
    ]);

    const results = [a, b];
    const okCount = results.filter((r) => r.ok).length;
    expect(okCount).toBe(1); // exactly one winner, never both, never neither

    const order = await findOrderByPublicRef(publicOrderRef);
    expect(order?.status).toBe("PAID"); // never stuck in an intermediate/corrupted state
    expect(order?.verifiedBy).toBe(ADMIN_USER);
    expect(sendMock).toHaveBeenCalledTimes(1); // the loser never triggered a second confirmation email
  });
});

describe("rejectOrderAction", () => {
  it("sends the rejection email exactly once, and reports its status in the action result", async () => {
    const publicOrderRef = await seedOrderInReview();
    mockRequestHeaders();

    const result = await rejectOrderAction(publicOrderRef, "not verifiable");
    expect(result.ok).toBe(true);
    expect(result.message).toContain("Rejection email sent");
    expect(result.needsRetry).toBeFalsy();
    expect(sendMock).toHaveBeenCalledTimes(1);

    // A repeated reject on the same (now-REJECTED) order must not send a second email.
    const repeat = await rejectOrderAction(publicOrderRef, "irrelevant");
    expect(repeat.ok).toBe(false);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("does not send an email when the caller is not authorized", async () => {
    const publicOrderRef = await seedOrderInReview();
    mockRequestHeaders({ authorization: null });

    const result = await rejectOrderAction(publicOrderRef, "reason");
    expect(result.ok).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();

    const order = await findOrderByPublicRef(publicOrderRef);
    expect(order?.status).toBe("REVIEW"); // untouched
  });

  it("surfaces a rejection-email delivery failure in the action result without undoing the rejection", async () => {
    sendMock.mockRejectedValue(new Error("network down"));
    const publicOrderRef = await seedOrderInReview();
    mockRequestHeaders();

    const result = await rejectOrderAction(publicOrderRef, "not verifiable");
    expect(result.ok).toBe(true); // the rejection itself succeeded
    expect(result.message).toContain("Rejection email NOT sent");
    expect(result.needsRetry).toBe(true);

    const order = await findOrderByPublicRef(publicOrderRef);
    expect(order?.status).toBe("REJECTED");
  });

  it("moves REVIEW -> REJECTED with reviewer/audit fields, and is idempotent", async () => {
    const publicOrderRef = await seedOrderInReview();
    mockRequestHeaders();

    const first = await rejectOrderAction(publicOrderRef, "Transaction ID not found in provider statement.");
    expect(first.ok).toBe(true);

    const order = await findOrderByPublicRef(publicOrderRef);
    expect(order?.status).toBe("REJECTED");
    expect(order?.verifiedBy).toBe(ADMIN_USER);
    expect(order?.verifiedAt).toBeInstanceOf(Date);

    const second = await rejectOrderAction(publicOrderRef, "irrelevant on retry");
    expect(second.ok).toBe(false);
  });

  it("rejects with missing credentials, no mutation occurs", async () => {
    const publicOrderRef = await seedOrderInReview();
    mockRequestHeaders({ authorization: null });

    const result = await rejectOrderAction(publicOrderRef, "reason");
    expect(result.ok).toBe(false);

    const order = await findOrderByPublicRef(publicOrderRef);
    expect(order?.status).toBe("REVIEW");
  });
});

describe("cancellation/refund — not applicable", () => {
  it("no cancel or refund admin action exists in the current implementation", async () => {
    const actionsModule = await import("@/app/masterclass/admin/orders/actions");
    const exportNames = Object.keys(actionsModule);
    expect(exportNames).toEqual(
      expect.arrayContaining(["approveOrderAction", "rejectOrderAction", "retryDeliveryAction"]),
    );
    expect(exportNames.some((name) => /cancel|refund/i.test(name))).toBe(false);
    // `CANCELLED`/`REFUNDED` exist as PaymentOrderStatus values (reserved for a
    // future real gateway per the type's own doc comment) but nothing in this
    // codebase can currently drive an order into either state. See this
    // fork's report for the explicit call-out.
  });
});

describe("email/CAPI delivery state via the approve action, and no duplicate on retry", () => {
  it("approve transitions confirmationEmail to SENT (Resend mocked) and purchaseCapi fails soft when Meta env is absent", async () => {
    const publicOrderRef = await seedOrderInReview();
    mockRequestHeaders();

    await approveOrderAction(publicOrderRef);

    const order = await findOrderByPublicRef(publicOrderRef);
    expect(order?.confirmationEmail.status).toBe("SENT");
    expect(order?.purchaseCapi.status).toBe("FAILED");
    expect(order?.purchaseCapi.lastErrorCode).toBe("CAPI_NOT_CONFIGURED");
  });

  it("fires exactly one mocked CAPI Purchase event when Meta env is configured", async () => {
    vi.stubEnv("META_PIXEL_ID", "1234567890");
    vi.stubEnv("META_CAPI_ACCESS_TOKEN", "capi-token");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    const publicOrderRef = await seedOrderInReview();
    mockRequestHeaders();
    await approveOrderAction(publicOrderRef);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const order = await findOrderByPublicRef(publicOrderRef);
    expect(order?.purchaseCapi.status).toBe("SENT");
  });

  it("retryDeliveryAction re-sends only the not-yet-SENT delivery and never duplicates an already-SENT email", async () => {
    const publicOrderRef = await seedOrderInReview();
    mockRequestHeaders();
    await approveOrderAction(publicOrderRef); // email SENT, CAPI FAILED (not configured)
    expect(sendMock).toHaveBeenCalledTimes(1);

    await retryDeliveryAction(publicOrderRef);

    // Email was already SENT — retry must not call Resend again.
    expect(sendMock).toHaveBeenCalledTimes(1);
    const order = await findOrderByPublicRef(publicOrderRef);
    expect(order?.confirmationEmail.status).toBe("SENT");
    expect(order?.purchaseCapi.attempts).toBeGreaterThanOrEqual(2);
  });

  it("retryDeliveryAction rejects an unauthorized caller before touching delivery state", async () => {
    const publicOrderRef = await seedOrderInReview();
    mockRequestHeaders();
    await approveOrderAction(publicOrderRef);
    sendMock.mockClear();

    mockRequestHeaders({ authorization: null });
    const result = await retryDeliveryAction(publicOrderRef);
    expect(result.ok).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe("legacy payment-order compatibility — rejectionEmail field entirely absent", () => {
  /**
   * Models a REAL Production shape: an order rejected before `rejectionEmail`
   * existed has no such key in the stored document at all (not `null`, not
   * an object with default sub-fields — genuinely absent). Built by rewriting
   * a real order via a raw collection update with `$unset`, then confirmed
   * absent, rather than trusting the `PaymentOrderDocument` TypeScript type
   * (which is not enforced against pre-existing data).
   */
  async function seedLegacyRejectedOrderWithNoRejectionEmailField(): Promise<string> {
    const publicOrderRef = await seedOrderInReview();
    const connection = await connectToDatabase();
    const db = connection.connection.db!;
    await db.collection(PAYMENT_ORDERS_COLLECTION).updateOne(
      { publicOrderRef },
      {
        $set: { status: "REJECTED", verifiedAt: new Date(), verifiedBy: "legacy-admin" },
        $unset: { rejectionEmail: "", activeOrderLock: "" },
      },
    );
    const raw = await db.collection(PAYMENT_ORDERS_COLLECTION).findOne({ publicOrderRef });
    expect(raw).not.toHaveProperty("rejectionEmail"); // the fixture genuinely has no field, not a null/default one
    return publicOrderRef;
  }

  it("a deliberate admin Retry click on a legacy REJECTED order never crashes, and can send the first-ever notification for it", async () => {
    const publicOrderRef = await seedLegacyRejectedOrderWithNoRejectionEmailField();
    mockRequestHeaders();

    const result = await retryDeliveryAction(publicOrderRef); // must not throw
    expect(result.ok).toBe(true);
    expect(result.message).toContain("Rejection email sent");
    expect(sendMock).toHaveBeenCalledTimes(1);

    const after = await findOrderByPublicRef(publicOrderRef);
    expect(after?.rejectionEmail.status).toBe("SENT");
  });

  it("the delivery summary reports a safe default (never crashes) when a legacy order's retry attempt also fails", async () => {
    sendMock.mockRejectedValue(new Error("network down"));
    const publicOrderRef = await seedLegacyRejectedOrderWithNoRejectionEmailField();
    mockRequestHeaders();

    const result = await retryDeliveryAction(publicOrderRef); // must not throw
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Rejection email NOT sent");
    expect(result.needsRetry).toBe(true);
  });

  it("this legacy shape is never touched automatically — only an explicit Server Action call (a human's Retry click) ever reaches it", async () => {
    // rejectOrderAction's atomic transition requires status REVIEW; a legacy
    // order is already REJECTED, so it can only ever report already_processed
    // here — never re-attempt (and never re-send) anything for it.
    const publicOrderRef = await seedLegacyRejectedOrderWithNoRejectionEmailField();
    mockRequestHeaders();

    const result = await rejectOrderAction(publicOrderRef, "irrelevant");
    expect(result.ok).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });
});
