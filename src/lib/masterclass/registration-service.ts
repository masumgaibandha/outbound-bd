import { getMongoClient } from "@/lib/masterclass/db";
import * as constants from "@/lib/masterclass/constants";
import {
  IdempotencyConflictError,
  PublicReferenceCollisionError,
  PublicReferenceGenerationError,
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
 * connection pool), and bounded retries were added around the transaction —
 * see the doc comments on the two constants below, and on
 * `registerForMasterclass()`, for why.
 *
 * Both retry loops below always start a brand-new `client.startSession()`
 * (and therefore a brand-new transaction) per attempt — never continue
 * operating inside a session whose transaction a prior operation may have
 * already aborted. Confirmed empirically against a real MongoDB replica
 * set: any write error inside a multi-document transaction (a duplicate-key
 * error included) aborts the *entire* transaction server-side, and every
 * later operation on that same session — even a plain read — then fails
 * with `NoSuchTransaction: Transaction ... has been aborted`. Earlier code
 * here retried by re-reading on the same (already-aborted) session inside a
 * single transaction; that read would itself throw `NoSuchTransaction`, an
 * error `isDuplicateKeyError()` doesn't recognize, so it escaped uncaught.
 * Every retry must be a genuinely fresh transaction, which is exactly what
 * looping back to the top of `registerForMasterclass()`'s `for` loop does.
 */

/**
 * MongoDB transactions use snapshot reads: if a genuinely concurrent
 * request already committed the winning payment order (on either the
 * `uniq_batch_idempotency_key` or `uniq_active_or_paid_order_per_registration`
 * partial unique index — see `payment-orders-repository.ts`) *after* this
 * transaction's snapshot was taken, `createDraftOrder()`'s insert collides
 * with it. `createDraftOrder()` never re-reads on that same (now-aborted)
 * session to look for the winner — the same empirically-confirmed hazard as
 * `upsertRegistration()` above applies here too — so the raw duplicate-key
 * error is rethrown unchanged. That error is never a bug — the index did
 * its job and no duplicate was ever persisted — so one retry with a
 * brand-new session (a fresh snapshot that *will* see the committed winner)
 * is enough to turn it into a normal "reused the existing order" outcome
 * instead of a 500.
 */
const MAX_ORDER_FINGERPRINT_ATTEMPTS = 2;

/**
 * Separate, dedicated budget for the astronomically unlikely case that
 * `upsertRegistration()`'s freshly generated random `publicRegistrationRef`
 * collides with an existing one (31^8 ≈ 852 billion possibilities — a safety
 * net, not an expected path; see `refs.ts`). Tracked independently from
 * `MAX_ORDER_FINGERPRINT_ATTEMPTS` so a retry of one kind never eats into the
 * other's budget. Every attempt is a brand-new transaction (see above) —
 * `upsertRegistration()` itself never loops or retries internally.
 */
const MAX_REFERENCE_ATTEMPTS = 5;

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

  let referenceAttempts = 0;
  let orderFingerprintAttempts = 0;

  for (;;) {
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
      if (error instanceof PublicReferenceCollisionError) {
        referenceAttempts++;
        if (referenceAttempts < MAX_REFERENCE_ATTEMPTS) {
          continue; // fresh session/transaction next iteration — see MAX_REFERENCE_ATTEMPTS doc comment
        }
        throw new PublicReferenceGenerationError();
      }
      if (isDuplicateKeyError(error)) {
        orderFingerprintAttempts++;
        if (orderFingerprintAttempts < MAX_ORDER_FINGERPRINT_ATTEMPTS) {
          continue; // fresh session/snapshot next iteration — see MAX_ORDER_FINGERPRINT_ATTEMPTS doc comment
        }
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
