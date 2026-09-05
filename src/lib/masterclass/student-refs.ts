import { randomInt } from "node:crypto";

import { REGISTRATION_REF_ALPHABET } from "@/lib/masterclass/refs";

const STUDENT_ID_RANDOM_LENGTH = 10;

/** `true` only for the `STU-` + 10-character shape from the shared unambiguous alphabet. */
export const PUBLIC_STUDENT_ID_PATTERN = /^STU-[23456789A-HJ-NP-Z]{10}$/;

function randomStudentSuffix(): string {
  let suffix = "";
  for (let i = 0; i < STUDENT_ID_RANDOM_LENGTH; i++) {
    suffix += REGISTRATION_REF_ALPHABET[randomInt(REGISTRATION_REF_ALPHABET.length)];
  }
  return suffix;
}

/**
 * `STU-` + 10 cryptographically random characters (`node:crypto`'s
 * `randomInt`, never `Math.random()`) from the exact same 31-character
 * unambiguous alphabet `generateRandomRegistrationRef()` uses — 31^10
 * possibilities, a safety net collision space, not an expected path.
 * Display/search only — never authentication. Does not itself guarantee
 * uniqueness; `uniq_public_student_id` on the `masterclass_students`
 * collection is the actual guarantee, and `upsertStudentForApproval()` in
 * `students-repository.ts` retries (bounded, fresh transaction per attempt)
 * on the astronomically unlikely collision.
 */
export function generateRandomStudentId(): string {
  return `STU-${randomStudentSuffix()}`;
}
