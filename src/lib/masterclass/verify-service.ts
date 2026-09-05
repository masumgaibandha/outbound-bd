import { getMongoClient } from "@/lib/masterclass/db";
import { getMetaCapiEnv } from "@/lib/masterclass/env";
import { registration as registrationCopy } from "@/data/masterclass-content";
import {
  ApprovalConsistencyError,
  OrderNotActionableError,
  PublicStudentIdCollisionError,
  StudentEmailRaceError,
  StudentLinkGenerationError,
} from "@/lib/masterclass/errors";
import { sendConfirmationEmail, sendRejectionEmail } from "@/lib/masterclass/email";
import { sendPurchaseEvent } from "@/lib/masterclass/meta-capi";
import {
  findOrderByPublicRef,
  getRejectionEmailState,
  linkOrderToStudent,
  rejectPayment,
  updateDeliveryState,
  verifyPayment,
} from "@/lib/masterclass/payment-orders-repository";
import {
  findRegistrationById,
  linkRegistrationToStudent,
  markRegistrationEnrolled,
} from "@/lib/masterclass/registrations-repository";
import { upsertStudentForApproval } from "@/lib/masterclass/students-repository";
import type {
  PaymentOrderDocument,
  RegistrationDocument,
  StudentDocument,
} from "@/types/masterclass-persistence";

/**
 * Orchestrates everything that happens at `REVIEW → PAID`, driven by the
 * admin approve Server Action.
 *
 * Every state change this produces — the order's own `REVIEW → PAID`
 * transition, the registration's `→ ENROLLED` transition, the permanent
 * Student's creation-or-reuse, and both `studentId` links — now happens
 * inside ONE `session.withTransaction()` call, never as independent
 * unguarded writes. This closes a real, pre-existing gap: the previous
 * version of this function performed `verifyPayment()` and
 * `markRegistrationEnrolled()` as two separate atomic single-document
 * writes with no shared transaction, so a process crash between them could
 * leave an order `PAID` with its registration still not `ENROLLED`. Adding
 * a *third*, more consequential write (the Student link) to that same
 * unguarded sequence would have made the gap worse instead of closing it.
 *
 * Every attempt starts a genuinely fresh `client.startSession()` — the same
 * empirically-confirmed discipline `registerForMasterclass()` already
 * uses: any write error inside a multi-document transaction aborts it
 * entirely, and every later operation on that same session (even a plain
 * read) then fails with `NoSuchTransaction`. So no step here ever re-reads
 * on a session a prior step's error may have already poisoned; a collision
 * always means "start over with a brand-new session," never "read again on
 * this one." `order`/`registration`/`student` are declared fresh inside
 * the loop body on every iteration, so a value captured by an attempt that
 * later aborted can never leak into the post-commit email/CAPI step.
 */

const MAX_STUDENT_LINK_ATTEMPTS = 5;

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
  let studentLinkAttempts = 0;

  // Declared outside the loop only so the winning attempt's values survive
  // to the post-commit step below — explicitly reset to `undefined` at the
  // top of every iteration (see the doc comment above this function) so a
  // value from an aborted attempt can never leak into a later attempt's
  // post-commit handling.
  let committedOrder: PaymentOrderDocument | undefined;
  let committedRegistration: RegistrationDocument | undefined;

  for (;;) {
    committedOrder = undefined;
    committedRegistration = undefined;

    const client = await getMongoClient();
    const session = client.startSession();

    try {
      await session.withTransaction(async () => {
        const order = await verifyPayment({ publicOrderRef, verifiedBy }, session);
        // A plain `findOneAndUpdate` returning null is a normal, non-throwing
        // result (already processed, or never existed) — not a Mongo error,
        // so it does not abort anything by itself. Thrown as a sentinel here
        // purely to unwind out of the transaction callback in one place.
        if (!order) {
          throw new OrderNotActionableError();
        }

        const registration = await findRegistrationById(order.registrationId, session);
        if (!registration) {
          throw new ApprovalConsistencyError(
            `registration ${order.registrationId.toHexString()} not found for order ${order.publicOrderRef}`,
          );
        }
        if (!registration._id || !registration._id.equals(order.registrationId)) {
          throw new ApprovalConsistencyError("registration does not belong to this order");
        }

        const enrolledResult = await markRegistrationEnrolled(order.registrationId, session);
        if (enrolledResult.matchedCount !== 1) {
          throw new ApprovalConsistencyError("registration status transition matched zero documents");
        }

        const student: StudentDocument = await upsertStudentForApproval(
          {
            name: registration.name,
            email: registration.email,
            emailNormalized: registration.emailNormalized,
            phone: registration.phone,
            phoneE164: registration.phoneE164,
          },
          session,
        );
        if (!student._id) {
          throw new ApprovalConsistencyError("Student upsert returned no _id");
        }

        const registrationLink = await linkRegistrationToStudent(registration._id, student._id, session);
        if (registrationLink.matchedCount !== 1) {
          throw new ApprovalConsistencyError("registration.studentId link matched zero documents");
        }

        const orderLink = await linkOrderToStudent(order._id!, student._id, session);
        if (orderLink.matchedCount !== 1) {
          throw new ApprovalConsistencyError("paymentOrder.studentId link matched zero documents");
        }

        committedOrder = { ...order, studentId: student._id };
        committedRegistration = { ...registration, status: "ENROLLED", studentId: student._id };
      });

      // Transaction committed — break out to the post-commit side effects below.
      break;
    } catch (error) {
      if (error instanceof OrderNotActionableError) {
        const existing = await findOrderByPublicRef(publicOrderRef);
        return existing ? { kind: "already_processed" } : { kind: "not_found" };
      }
      if (error instanceof PublicStudentIdCollisionError || error instanceof StudentEmailRaceError) {
        studentLinkAttempts++;
        if (studentLinkAttempts < MAX_STUDENT_LINK_ATTEMPTS) {
          continue; // fresh session/transaction next iteration
        }
        throw new StudentLinkGenerationError();
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }

  // `committedOrder`/`committedRegistration` are always set here — the loop
  // only ever reaches this point via `break`, immediately after a
  // successful commit.
  const order = committedOrder!;
  const registration = committedRegistration!;

  await Promise.allSettled([
    attemptConfirmationEmail(order, registration),
    attemptPurchaseCapi(order, registration, eventSourceUrl),
  ]);

  return { kind: "ok", order };
}

async function attemptRejectionEmail(
  order: PaymentOrderDocument,
  registration: RegistrationDocument,
): Promise<void> {
  const result = await sendRejectionEmail({
    toEmail: registration.email,
    studentName: registration.name,
    registrationRef: registration.publicRegistrationRef,
    idempotencyRef: order.publicOrderRef,
  });
  await updateDeliveryState(order.publicOrderRef, "rejectionEmail", result);
}

export type RejectPaymentResult =
  | { kind: "ok"; order: PaymentOrderDocument }
  | { kind: "not_found" }
  | { kind: "already_processed" };

/**
 * `REVIEW → REJECTED`, driven by the admin reject Server Action. Same
 * shape/guarantees as `approvePayment()`: the atomic transition
 * (`rejectPayment()`) happens first and is the only thing that decides
 * whether this is a genuine first-time rejection — a retried/duplicate
 * reject click (refresh, double-click) matches nothing the second time and
 * this reports `already_processed`, so the rejection email below can only
 * ever be attempted once per order, on the single winning transition. No
 * Meta Pixel/CAPI event is ever sent for a rejection (see `meta-capi.ts` —
 * Purchase is fired only from `approvePayment()`, at `REVIEW → PAID`).
 */
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

  const registration = await findRegistrationById(order.registrationId);
  if (registration) {
    await attemptRejectionEmail(order, registration);
  }

  return { kind: "ok", order };
}

/**
 * Re-attempts confirmation email + CAPI for an already-`PAID` order, or the
 * rejection email for an already-`REJECTED` order, whichever delivery isn't
 * `SENT` yet. Used by the admin page's "Retry" action — the same retry
 * architecture now covers both outcomes rather than a second, parallel one.
 */
export async function retryDelivery(publicOrderRef: string, eventSourceUrl: string): Promise<void> {
  const order = await findOrderByPublicRef(publicOrderRef);
  if (!order) return;

  const registration = await findRegistrationById(order.registrationId);
  if (!registration) return;

  if (order.status === "PAID") {
    const tasks: Promise<void>[] = [];
    if (order.confirmationEmail.status !== "SENT") {
      tasks.push(attemptConfirmationEmail(order, registration));
    }
    if (order.purchaseCapi.status !== "SENT") {
      tasks.push(attemptPurchaseCapi(order, registration, eventSourceUrl));
    }
    await Promise.allSettled(tasks);
    return;
  }

  if (order.status === "REJECTED") {
    // A REJECTED order from before this field existed has no `rejectionEmail`
    // at all in the stored document — `getRejectionEmailState` reads that as
    // "never attempted" rather than throwing, so an operator's explicit
    // Retry click can deliberately backfill a notification for an old
    // rejection. Never automatic: this only ever runs from a Server Action a
    // human clicked, never a background job or bulk pass over old records.
    const rejectionEmail = getRejectionEmailState(order);
    if (rejectionEmail.status !== "SENT") {
      await attemptRejectionEmail(order, registration);
    }
  }
}
