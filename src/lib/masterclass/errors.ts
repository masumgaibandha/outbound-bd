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

/**
 * Thrown the instant a Student upsert's freshly generated `publicStudentId`
 * collides with an existing (different) student — the exact same aborted-
 * transaction hazard as `PublicReferenceCollisionError` above, so this
 * deliberately carries no re-read of any kind. See `approvePayment()` in
 * `verify-service.ts` for the fresh-session retry loop that catches this
 * specifically and generates a brand-new candidate ID.
 */
export class PublicStudentIdCollisionError extends Error {
  constructor() {
    super("The randomly generated public student ID collided with an existing one.");
    this.name = "PublicStudentIdCollisionError";
  }
}

/**
 * Thrown when a Student upsert's `emailNormalized` match fails because a
 * genuinely concurrent approval (a different order/registration, same
 * student, racing) already committed the winning Student document after
 * this transaction's snapshot was taken. Never a bug — resolved by retrying
 * with a brand-new session/transaction, whose own fresh snapshot will see
 * the committed winner and match-update it instead of trying to insert.
 */
export class StudentEmailRaceError extends Error {
  constructor() {
    super("A concurrent approval already created the Student for this email.");
    this.name = "StudentEmailRaceError";
  }
}

/** Every bounded attempt at creating/linking a Student during payment approval collided. Astronomically unlikely — a controlled failure, never an unhandled crash. */
export class StudentLinkGenerationError extends Error {
  constructor() {
    super("Could not create or link a Student after several attempts.");
    this.name = "StudentLinkGenerationError";
  }
}

/**
 * Thrown when `approvePayment()`'s own internal consistency checks fail —
 * the registration referenced by an order is missing, or an update inside
 * the approval transaction matched zero documents when exactly one was
 * expected. This is never a normal outcome (unlike `not_found`/
 * `already_processed`, which are legitimate states a retried/duplicate
 * click can produce): it means the data was not in the shape the approval
 * logic assumed, so the whole transaction aborts rather than ever
 * committing a PAID order with an unlinked registration or Student.
 */
export class ApprovalConsistencyError extends Error {
  constructor(reason: string) {
    super(`Payment approval aborted: ${reason}`);
    this.name = "ApprovalConsistencyError";
  }
}

/**
 * Thrown inside the approval transaction when `verifyPayment()`'s own
 * `findOneAndUpdate` (guarded on `status: "REVIEW"`) matches nothing — the
 * order was already processed by a previous call, or never existed. A
 * plain sentinel, never retried: the caller catches this specifically and
 * does one fresh, sessionless read to disambiguate "not_found" from
 * "already_processed", exactly matching the pre-existing external contract.
 */
export class OrderNotActionableError extends Error {
  constructor() {
    super("The order is not in a state that can be approved.");
    this.name = "OrderNotActionableError";
  }
}
