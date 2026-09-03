import { describe, expect, it } from "vitest";

import { timingSafeStringEqual } from "@/lib/masterclass/timing-safe-equal";

describe("timingSafeStringEqual", () => {
  it("returns true for identical strings", () => {
    expect(timingSafeStringEqual("hunter2", "hunter2")).toBe(true);
    expect(timingSafeStringEqual("", "")).toBe(true);
  });

  it("returns false for different strings of the same length", () => {
    expect(timingSafeStringEqual("hunter2", "hunter3")).toBe(false);
  });

  it("returns false for different-length strings without throwing", () => {
    expect(timingSafeStringEqual("short", "a-much-longer-string")).toBe(false);
  });
});
