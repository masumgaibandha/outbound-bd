/**
 * Thrown from inside a `session.withTransaction()` callback to abort the
 * transaction and signal an expected business outcome (not a bug) up to
 * `registration-service.ts`. Messages are static and generic on purpose —
 * safe to appear in a stack trace, but never logged with any request detail
 * attached. Ported verbatim from the MasumDev masterclass source.
 */

export class RegistrationConflictError extends Error {
  constructor() {
    super("Existing registration for this batch/email has a different phone number on file.");
    this.name = "RegistrationConflictError";
  }
}

export class IdempotencyConflictError extends Error {
  constructor() {
    super("Idempotency key already used for a different registration or request.");
    this.name = "IdempotencyConflictError";
  }
}

/** The submitted transaction ID (normalized) is already recorded against a different order. */
export class DuplicateTransactionError extends Error {
  constructor() {
    super("This transaction ID is already recorded against another order.");
    this.name = "DuplicateTransactionError";
  }
}

/** The order exists but is no longer in a state that accepts a manual-payment submission (already PAID/REJECTED/CANCELLED). */
export class OrderNotEditableError extends Error {
  constructor() {
    super("This order is no longer accepting payment submissions.");
    this.name = "OrderNotEditableError";
  }
}

/** Every bounded attempt at generating a unique random public registration reference collided. Astronomically unlikely (31^8 possibilities) — a controlled failure, never an unhandled crash. */
export class PublicReferenceGenerationError extends Error {
  constructor() {
    super("Could not generate a unique public registration reference after several attempts.");
    this.name = "PublicReferenceGenerationError";
  }
}

/**
 * Thrown the instant a single insert attempt's random `publicRegistrationRef`
 * collides with an existing document — signals the caller to retry the
 * *whole* transaction with a brand-new session, never to keep operating on
 * the session that just threw this. MongoDB aborts an entire multi-document
 * transaction on any write error (confirmed empirically against a real
 * replica set: a write's duplicate-key error leaves every later operation on
 * that same session — even a plain read — failing with
 * `NoSuchTransaction: Transaction ... has been aborted`), so this error
 * deliberately carries no re-read of any kind from inside
 * `upsertRegistration()`. See `registerForMasterclass()` in
 * `registration-service.ts` for the fresh-session retry loop that catches
 * this specifically.
 */
export class PublicReferenceCollisionError extends Error {
  constructor() {
    super("The randomly generated public registration reference collided with an existing one.");
    this.name = "PublicReferenceCollisionError";
  }
}
