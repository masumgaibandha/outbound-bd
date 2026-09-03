import { getMetaCapiEnv } from "@/lib/masterclass/env";
import { registration as registrationCopy } from "@/data/masterclass-content";
import { sendConfirmationEmail } from "@/lib/masterclass/email";
import { sendPurchaseEvent } from "@/lib/masterclass/meta-capi";
import {
  findOrderByPublicRef,
  rejectPayment,
  updateDeliveryState,
  verifyPayment,
} from "@/lib/masterclass/payment-orders-repository";
import {
  findRegistrationById,
  markRegistrationEnrolled,
} from "@/lib/masterclass/registrations-repository";
import type { PaymentOrderDocument, RegistrationDocument } from "@/types/masterclass-persistence";

/**
 * Orchestrates everything that happens at `REVIEW → PAID`, driven by the
 * admin approve Server Action. Ported verbatim from the MasumDev masterclass
 * source. The DB transition itself (`verifyPayment()`) is a single atomic
 * `findOneAndUpdate` guarded on `status: "REVIEW"` — a retried/duplicate
 * approval click matches nothing the second time and this function reports
 * `already_processed` rather than re-running any side effect. Email and
 * Meta CAPI are attempted *after* the transition is durable, never inside
 * it, and a failure in either one is recorded but never rolls back `PAID`.
 */

export type ApprovePaymentResult =
  | { kind: "ok"; order: PaymentOrderDocument }
  | { kind: "not_found" }
  | { kind: "already_processed" };

async function attemptConfirmationEmail(
  order: PaymentOrderDocument,
  registration: RegistrationDocument,
): Promise<void> {
  if (order.method === null) return; // unreachable once PAID, but keeps this function total
  const result = await sendConfirmationEmail({
    toEmail: registration.email,
    studentName: registration.name,
    registrationRef: registration.publicRegistrationRef,
    amountBDT: order.amount,
    method: order.method,
    classDateLabel: registrationCopy.dateValue,
  });
  await updateDeliveryState(order.publicOrderRef, "confirmationEmail", result);
}

async function attemptPurchaseCapi(
  order: PaymentOrderDocument,
  registration: RegistrationDocument,
  eventSourceUrl: string,
): Promise<void> {
  const metaEnv = getMetaCapiEnv();
  if (!metaEnv) {
    await updateDeliveryState(order.publicOrderRef, "purchaseCapi", {
      ok: false,
      errorCode: "CAPI_NOT_CONFIGURED",
    });
    return;
  }

  const result = await sendPurchaseEvent({
    order,
    emailNormalized: registration.emailNormalized,
    phoneE164: registration.phoneE164,
    attribution: order.attribution,
    eventSourceUrl,
    pixelId: metaEnv.pixelId,
    accessToken: metaEnv.capiAccessToken,
  });
  await updateDeliveryState(
    order.publicOrderRef,
    "purchaseCapi",
    result.ok ? { ok: true } : { ok: false, errorCode: result.errorCode },
  );
}

export async function approvePayment(
  publicOrderRef: string,
  verifiedBy: string,
  eventSourceUrl: string,
): Promise<ApprovePaymentResult> {
  const order = await verifyPayment({ publicOrderRef, verifiedBy });
  if (!order) {
    const existing = await findOrderByPublicRef(publicOrderRef);
    return existing ? { kind: "already_processed" } : { kind: "not_found" };
  }

  const registration = await findRegistrationById(order.registrationId);
  if (!registration) {
    /* Should be unreachable (every order has a registration) — but never send an email/CAPI event with no recipient. */
    return { kind: "ok", order };
  }

  await markRegistrationEnrolled(order.registrationId);

  await Promise.allSettled([
    attemptConfirmationEmail(order, registration),
    attemptPurchaseCapi(order, registration, eventSourceUrl),
  ]);

  return { kind: "ok", order };
}

export type RejectPaymentResult =
  | { kind: "ok"; order: PaymentOrderDocument }
  | { kind: "not_found" }
  | { kind: "already_processed" };

export async function rejectPaymentOrder(
  publicOrderRef: string,
  verifiedBy: string,
  reason: string | null,
): Promise<RejectPaymentResult> {
  const order = await rejectPayment({ publicOrderRef, verifiedBy, reason });
  if (!order) {
    const existing = await findOrderByPublicRef(publicOrderRef);
    return existing ? { kind: "already_processed" } : { kind: "not_found" };
  }
  return { kind: "ok", order };
}

/** Re-attempts confirmation email + CAPI for an already-`PAID` order whose delivery isn't `SENT` yet. Used by the admin page's "Retry" action. */
export async function retryDelivery(publicOrderRef: string, eventSourceUrl: string): Promise<void> {
  const order = await findOrderByPublicRef(publicOrderRef);
  if (!order || order.status !== "PAID") return;

  const registration = await findRegistrationById(order.registrationId);
  if (!registration) return;

  const tasks: Promise<void>[] = [];
  if (order.confirmationEmail.status !== "SENT") {
    tasks.push(attemptConfirmationEmail(order, registration));
  }
  if (order.purchaseCapi.status !== "SENT") {
    tasks.push(attemptPurchaseCapi(order, registration, eventSourceUrl));
  }
  await Promise.allSettled(tasks);
}
