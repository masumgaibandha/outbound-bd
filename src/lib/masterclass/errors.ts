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
