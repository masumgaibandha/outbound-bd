import "server-only";

import { randomInt } from "node:crypto";

const SUFFIX_ALPHABET = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I/O, avoids visual ambiguity
const SUFFIX_LENGTH = 6;

function randomSuffix(): string {
  let suffix = "";
  for (let i = 0; i < SUFFIX_LENGTH; i += 1) {
    suffix += SUFFIX_ALPHABET[randomInt(0, SUFFIX_ALPHABET.length)];
  }
  return suffix;
}

/** Generates a unique-enough, human-readable order number like OBD-20260826-7K3PQ2. */
export function generateOrderNumber(): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `OBD-${datePart}-${randomSuffix()}`;
}
