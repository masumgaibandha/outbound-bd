import { describe, expect, it } from "vitest";

import { generateRandomStudentId, PUBLIC_STUDENT_ID_PATTERN } from "@/lib/masterclass/student-refs";
import { REGISTRATION_REF_ALPHABET } from "@/lib/masterclass/refs";

describe("generateRandomStudentId", () => {
  it("produces the STU- + 10-character shape from the shared unambiguous alphabet", () => {
    const id = generateRandomStudentId();
    expect(id).toMatch(PUBLIC_STUDENT_ID_PATTERN);
    expect(id.startsWith("STU-")).toBe(true);
    const suffix = id.slice(4);
    expect(suffix).toHaveLength(10);
    for (const char of suffix) {
      expect(REGISTRATION_REF_ALPHABET).toContain(char);
    }
  });

  it("never includes visually ambiguous characters (0, O, 1, I, L)", () => {
    for (let i = 0; i < 200; i++) {
      const id = generateRandomStudentId();
      expect(id).not.toMatch(/[0O1IL]/);
    }
  });

  it("produces different IDs across repeated calls (not derived from a counter or timestamp)", () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateRandomStudentId()));
    expect(ids.size).toBe(50);
  });
});
