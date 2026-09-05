import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Wraps the real `randomInt` so its call count is observable without trying
// to `vi.spyOn` a live ESM named export directly (not supported — module
// namespaces are non-configurable). Every other export, and randomInt's own
// behavior, is untouched — this file's other tests still exercise real
// cryptographic randomness.
const randomIntSpy = vi.hoisted(() => vi.fn());
vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  randomIntSpy.mockImplementation(actual.randomInt);
  return { ...actual, randomInt: randomIntSpy };
});

import {
  RANDOM_REGISTRATION_REF_PATTERN,
  REGISTRATION_REF_PATTERN,
  generateRandomRegistrationRef,
} from "@/lib/masterclass/refs";

beforeEach(() => {
  randomIntSpy.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const AMBIGUOUS_CHARS = ["0", "O", "1", "I", "L"];

describe("generateRandomRegistrationRef", () => {
  it("produces the exact MC-<year>-XXXXXXXX shape with the fixed prefix", () => {
    const ref = generateRandomRegistrationRef(2026);
    expect(ref).toMatch(/^MC-2026-[A-Z0-9]{8}$/);
    expect(ref.startsWith("MC-2026-")).toBe(true);
  });

  it("uses only uppercase letters and digits from the allowed alphabet — never 0, O, 1, I, or L", () => {
    for (let i = 0; i < 200; i++) {
      const suffix = generateRandomRegistrationRef(2026).slice("MC-2026-".length);
      expect(suffix).toHaveLength(8);
      for (const char of suffix) {
        expect(AMBIGUOUS_CHARS).not.toContain(char);
        expect(/^[A-Z0-9]$/.test(char)).toBe(true);
      }
    }
  });

  it("never introduces any symbol beyond the fixed hyphens", () => {
    const ref = generateRandomRegistrationRef(2026);
    expect(ref).not.toMatch(/[^A-Z0-9-]/);
  });

  it("generates different IDs across many samples (not derived from a predictable source)", () => {
    const samples = new Set(Array.from({ length: 500 }, () => generateRandomRegistrationRef(2026)));
    // Astronomically unlikely to collide even once in 500 draws from 31^8 possibilities.
    expect(samples.size).toBe(500);
  });

  it("uses node:crypto's randomInt (cryptographically secure), not Math.random()", () => {
    const mathRandomSpy = vi.spyOn(Math, "random");

    generateRandomRegistrationRef(2026);

    // Exactly 8 calls — one per generated character, none skipped or batched.
    expect(randomIntSpy).toHaveBeenCalledTimes(8);
    expect(mathRandomSpy).not.toHaveBeenCalled();
  });

  it("is not derived from any predictable input — two calls in the same tick for the same year differ", () => {
    const a = generateRandomRegistrationRef(2026);
    const b = generateRandomRegistrationRef(2026);
    expect(a).not.toBe(b);
  });
});

describe("REGISTRATION_REF_PATTERN (legacy + random compatibility)", () => {
  it("accepts the legacy zero-padded sequential shape", () => {
    expect(REGISTRATION_REF_PATTERN.test("MC-2026-000001")).toBe(true);
    expect(REGISTRATION_REF_PATTERN.test("MC-2025-123456")).toBe(true);
  });

  it("accepts the new random shape", () => {
    expect(REGISTRATION_REF_PATTERN.test("MC-2026-K7M4Q9P2")).toBe(true);
    expect(REGISTRATION_REF_PATTERN.test(generateRandomRegistrationRef(2026))).toBe(true);
  });

  it("rejects nonsense and malformed shapes", () => {
    expect(REGISTRATION_REF_PATTERN.test("MC-2026-00001")).toBe(false); // too short (5 digits)
    expect(REGISTRATION_REF_PATTERN.test("MC-2026-K7M4Q9P")).toBe(false); // too short (7 chars)
    expect(REGISTRATION_REF_PATTERN.test("MC-2026-K7M4Q9P20")).toBe(false); // too long
    expect(REGISTRATION_REF_PATTERN.test("MC-2026-K7M4Q9O2")).toBe(false); // contains ambiguous 'O'
    expect(REGISTRATION_REF_PATTERN.test("not-a-ref")).toBe(false);
  });
});

describe("RANDOM_REGISTRATION_REF_PATTERN", () => {
  it("matches only the random shape, never the legacy sequential one", () => {
    expect(RANDOM_REGISTRATION_REF_PATTERN.test(generateRandomRegistrationRef(2026))).toBe(true);
    expect(RANDOM_REGISTRATION_REF_PATTERN.test("MC-2026-000001")).toBe(false);
  });
});
