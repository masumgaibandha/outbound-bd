import { describe, expect, it } from "vitest";

import { founderStats } from "@/components/public/founder-stats";

describe("founderStats (centralized founder-credibility data)", () => {
  it("is defined in exactly one place and reflects the verified Upwork figures", () => {
    const labels = founderStats.map((stat) => stat.label);
    const values = founderStats.map((stat) => stat.value);

    expect(values).toContain("245");
    expect(labels.some((label) => /upwork jobs/i.test(label))).toBe(true);
    expect(values).toContain("22,000+");
    expect(labels.some((label) => /hours/i.test(label))).toBe(true);
  });

  it("never publishes an earnings figure or placeholder text for one", () => {
    const rendered = JSON.stringify(founderStats).toLowerCase();
    expect(rendered).not.toContain("earned");
    expect(rendered).not.toContain("$150k");
    expect(rendered).not.toContain("awaiting confirmation");
    expect(rendered).not.toContain("pending");
  });

  it("does not show the Job Success Score (91%) unless explicitly requested", () => {
    const rendered = JSON.stringify(founderStats);
    expect(rendered).not.toContain("91%");
    expect(rendered.toLowerCase()).not.toContain("job success");
  });
});
