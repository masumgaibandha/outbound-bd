import { getMongoClient } from "@/lib/masterclass/db";
import * as constants from "@/lib/masterclass/constants";
import {
  IdempotencyConflictError,
  RegistrationConflictError,
} from "@/lib/masterclass/errors";
import { createDraftOrder, isDuplicateKeyError } from "@/lib/masterclass/payment-orders-repository";
import { upsertRegistration } from "@/lib/masterclass/registrations-repository";
import type { RegistrationInput } from "@/lib/masterclass/validation";
import type { AttributionSnapshot } from "@/types/masterclass-persistence";

/**
 * Ported from the MasumDev masterclass source. Only the client accessor
 * changed (`getMongoClient()` from `@/lib/masterclass/db`, reusing Outbound
 * BD's existing Mongoose connection, instead of a second native-driver
 * connection pool), and a bounded retry was added around the transaction —
 * see the doc comment on `registerForMasterclass()` for why.
 */

/**
 * MongoDB transactions use snapshot reads: if a genuinely concurrent
 * request already committed the winning payment order (on either the
 * `uniq_batch_idempotency_key` or `uniq_active_or_paid_order_per_registration`
 * partial unique index — see `payment-orders-repository.ts`) *after* this
 * transaction's snapshot was taken, `createDraftOrder()`'s own in-transaction
 * re-read can miss it and a raw duplicate-key error escapes instead of a
 * handled result. That error is never a bug — the index did its job and no
 * duplicate was ever persisted — so one retry with a brand-new session (a
 * fresh snapshot that *will* see the committed winner) is enough to turn it
 * into a normal "reused the existing order" outcome instead of a 500.
 */
const MAX_ATTEMPTS = 2;
export interface RegisterForMasterclassInput {
  input: RegistrationInput;
  emailNormalized: string;
  phoneE164: string;
  idempotencyKey: string;
  /** Derived server-side from request headers — never trusted from the body. */
  clientIpAddress: string | null;
  clientUserAgent: string | null;
}

export type RegisterForMasterclassResult =
  | { kind: "ok"; publicRegistrationRef: string; publicOrderRef: string; status: string }
  | { kind: "registration_conflict" }
  | { kind: "idempotency_conflict" };

/**
 * The one entry point that writes both collections. Runs in a single Atlas
 * transaction so a registration is never left without its draft order (or
 * vice versa) if the process dies partway through. Never marks anything
 * PAID, never sends email, never fires a Meta event — this only creates the
 * two records a future payment step will read and update.
 */
export async function registerForMasterclass(
  params: RegisterForMasterclassInput,
): Promise<RegisterForMasterclassResult> {
  const { input, emailNormalized, phoneE164, idempotencyKey, clientIpAddress, clientUserAgent } =
    params;

  const attribution: AttributionSnapshot = {
    ...input.attribution,
    capturedAt: new Date(),
  };

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const client = await getMongoClient();
    const session = client.startSession();

    try {
      let publicRegistrationRef = "";
      let publicOrderRef = "";
      let status = "";

      await session.withTransaction(async () => {
        const registration = await upsertRegistration(
          {
            masterclassSlug: constants.masterclassSlug,
            batchId: constants.batchId,
            name: input.name,
            email: input.email,
            emailNormalized,
            phone: input.phone,
            phoneE164,
            marketingConsent: input.marketingConsent,
            attribution,
          },
          session,
        );

        if (!registration._id) {
          throw new Error("Registration document is missing its _id after upsert.");
        }

        const { order } = await createDraftOrder(
          {
            registrationId: registration._id,
            masterclassSlug: constants.masterclassSlug,
            batchId: constants.batchId,
            /* The price actually charged right now — never recomputed from a later price change. */
            amount: constants.resolvePriceBDT(),
            currency: constants.currency,
            idempotencyKey,
            attribution,
            clientIpAddress,
            clientUserAgent,
          },
          session,
        );

        publicRegistrationRef = registration.publicRegistrationRef;
        publicOrderRef = order.publicOrderRef;
        status = order.status;
      });

      return { kind: "ok", publicRegistrationRef, publicOrderRef, status };
    } catch (error) {
      if (error instanceof RegistrationConflictError) {
        return { kind: "registration_conflict" };
      }
      if (error instanceof IdempotencyConflictError) {
        return { kind: "idempotency_conflict" };
      }
      if (isDuplicateKeyError(error) && attempt < MAX_ATTEMPTS) {
        continue; // retry once with a fresh session/snapshot — see MAX_ATTEMPTS doc comment
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /* Unreachable: the loop always returns or throws by the final attempt. */
  throw new Error("registerForMasterclass: exhausted retry attempts unexpectedly.");
}
