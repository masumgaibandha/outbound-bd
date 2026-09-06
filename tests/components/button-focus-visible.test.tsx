import { describe, expect, it } from "vitest";

import { buttonClass } from "@/components/public/button";

/*
 * Regression coverage for the shared focus-visible fix: HeroUI's base button
 * geometry ships an unconditional `outline-none`, which pins the shared
 * `--tw-outline-style` custom property to `none` — not just this element's
 * own `outline-style`. Tailwind's `outline-2`/`outline-offset-2` utilities
 * only ever set width/offset; the rendered style is always
 * `outline-style: var(--tw-outline-style)`, so without `outline-solid`
 * re-pinning that variable under `:focus-visible`, no ring paints even
 * though width/color/offset all look correctly applied. Checks assert on
 * individual class tokens (never a full-string snapshot) so unrelated future
 * class changes don't make this test brittle.
 */
function classTokens(options?: Parameters<typeof buttonClass>[0]) {
  return (buttonClass(options) ?? "").split(/\s+/);
}

describe("buttonClass shared focus-visible behavior", () => {
  it("restores a paintable outline-style scoped to :focus-visible", () => {
    expect(classTokens()).toContain("focus-visible:outline-solid");
  });

  it("keeps the existing focus width, color, and offset", () => {
    const tokens = classTokens();
    expect(tokens).toContain("focus-visible:outline-2");
    expect(tokens).toContain("focus-visible:outline-action");
    expect(tokens).toContain("focus-visible:outline-offset-2");
  });

  it("only applies the outline style under :focus-visible, never unconditionally", () => {
    const tokens = classTokens();
    expect(tokens).not.toContain("outline-solid");
    expect(tokens).not.toContain("outline");
  });

  it.each(["action", "outline", "ink", "quiet", "onDark", "onDarkOutline"] as const)(
    "applies the shared focus-visible outline to the %s tone",
    (tone) => {
      const tokens = classTokens({ tone });
      expect(tokens).toContain("focus-visible:outline-solid");
      expect(tokens).toContain("focus-visible:outline-2");
      expect(tokens).toContain("focus-visible:outline-action");
      expect(tokens).toContain("focus-visible:outline-offset-2");
    },
  );

  it("does not remove unrelated interaction classes (press lift, transitions, reduced-motion)", () => {
    const tokens = classTokens();
    expect(tokens).toContain("active:translate-y-px");
    expect(tokens).toContain("motion-reduce:transition-none");
    expect(tokens).toContain("motion-reduce:active:translate-y-0");
    expect(tokens.some((t) => t.startsWith("transition-"))).toBe(true);
  });
});
