import "../helpers/test-public-env";

import { describe, expect, it } from "vitest";

import robots from "@/app/robots";

describe("robots.ts", () => {
  it("disallows both admin surfaces and the API tree", () => {
    const result = robots();
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rule.disallow).toContain("/masterclass/admin/");
    expect(rule.disallow).toContain("/admin/");
    expect(rule.disallow).toContain("/api/");
  });
});
