import "../helpers/test-public-env";

import { describe, expect, it } from "vitest";

import sitemap from "@/app/sitemap";

const REMOVED_PATH_FRAGMENTS = [
  "/dashboard",
  "/admin",
  "/sign-in",
  "/sign-up",
  "/order",
  "/api/auth",
  "/api/orders",
  "/api/payments",
  "/api/payment-methods",
  "/api/admin",
];

describe("sitemap", () => {
  const entries = sitemap();
  const urls = entries.map((entry) => entry.url);

  it("excludes every removed auth/dashboard/order/payment route", () => {
    for (const fragment of REMOVED_PATH_FRAGMENTS) {
      const offending = urls.filter((url) => url.includes(fragment));
      expect(offending).toEqual([]);
    }
  });

  it("includes the current public agency pages", () => {
    for (const path of [
      "/",
      "/about",
      "/about/founder",
      "/services",
      "/how-it-works",
      "/results",
      "/pricing",
      "/testimonials",
      "/faq",
      "/contact",
      "/privacy-policy",
      "/terms-of-service",
    ]) {
      expect(urls).toContain(`http://localhost:3000${path}`);
    }
  });

  it("includes all four named service pages", () => {
    for (const slug of [
      "cold-email-outreach",
      "lead-generation",
      "email-infrastructure",
      "email-deliverability",
    ]) {
      expect(urls).toContain(`http://localhost:3000/services/${slug}`);
    }
  });
});
