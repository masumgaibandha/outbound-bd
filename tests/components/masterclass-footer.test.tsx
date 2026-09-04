// @vitest-environment jsdom
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MasterclassFooter } from "@/components/masterclass/MasterclassFooter";
import { footer } from "@/data/masterclass-content";
import { legalPageLinks } from "@/data/legal-content";

beforeEach(() => {
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("MasterclassFooter — return-to-website link", () => {
  it("renders the approved Bangla return text linking to /", () => {
    render(<MasterclassFooter />);
    const link = screen.getByRole("link", { name: "Outbound BD-এর মূল ওয়েবসাইটে ফিরে যান" });
    expect(link).toHaveAttribute("href", "/");
    expect(footer.backToPortfolio).toBe("Outbound BD-এর মূল ওয়েবসাইটে ফিরে যান");
  });

  it("does not point at MasumDev, an external URL, '#', '/contact', or an empty href", () => {
    render(<MasterclassFooter />);
    const link = screen.getByRole("link", { name: "Outbound BD-এর মূল ওয়েবসাইটে ফিরে যান" });
    const href = link.getAttribute("href");
    expect(href).toBe("/");
    expect(href).not.toMatch(/masumdev/i);
    expect(href).not.toMatch(/^https?:\/\//);
    expect(href).not.toBe("#");
    expect(href).not.toBe("/contact");
    expect(href).not.toBe("");
  });

  it("is present when registration is disabled (the footer itself never reads the flag)", () => {
    vi.stubEnv("MASTERCLASS_REGISTRATION_ENABLED", "false");
    render(<MasterclassFooter />);
    expect(
      screen.getByRole("link", { name: "Outbound BD-এর মূল ওয়েবসাইটে ফিরে যান" }),
    ).toBeInTheDocument();
  });

  it("keeps all three existing legal links intact alongside the return link", () => {
    render(<MasterclassFooter />);
    for (const link of legalPageLinks) {
      const el = screen.getByRole("link", { name: link.label });
      expect(el).toHaveAttribute("href", link.href);
    }
  });

  it("keeps the copyright text and wordmark unchanged", () => {
    render(<MasterclassFooter />);
    expect(screen.getByText(footer.copyright)).toBeInTheDocument();
  });
});

/**
 * `LegalPage` (shared by all three masterclass legal pages) and the
 * masterclass sales page both render this same `MasterclassFooter` — so the
 * return link and the legal links are shared chrome, not duplicated per
 * page. This just documents/locks that composition in place.
 */
describe("MasterclassFooter — shared across the sales page and all three legal pages", () => {
  it("LegalPage renders MasterclassFooter", () => {
    const source = readFileSync(
      path.resolve(__dirname, "../../src/components/masterclass/legal/LegalPage.tsx"),
      "utf8",
    );
    expect(source).toMatch(/<MasterclassFooter\s*\/>/);
  });

  it("the masterclass sales page renders MasterclassFooter", () => {
    const source = readFileSync(
      path.resolve(__dirname, "../../src/app/masterclass/lead-generation-cold-email/page.tsx"),
      "utf8",
    );
    expect(source).toMatch(/<MasterclassFooter\s*\/>/);
  });
});

/**
 * Regression guard for Part 1 of this change: the agency announcement
 * banner must never be imported by any masterclass-facing source file
 * (sales page, its layout, the shared masterclass header/footer, the legal
 * page chrome, or the admin order-review page) — it's mounted exactly once,
 * server-side, in `src/app/(public)/layout.tsx`.
 */
describe("masterclass surfaces — no accidental agency-banner import", () => {
  function collectFiles(dir: string): string[] {
    const entries = readdirSync(dir, { withFileTypes: true });
    return entries.flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return collectFiles(full);
      return entry.name.endsWith(".tsx") || entry.name.endsWith(".ts") ? [full] : [];
    });
  }

  const searchRoots = [
    path.resolve(__dirname, "../../src/app/masterclass"),
    path.resolve(__dirname, "../../src/components/masterclass"),
  ];

  it("no file under src/app/masterclass or src/components/masterclass references the agency banner", () => {
    const offenders: string[] = [];
    for (const root of searchRoots) {
      for (const file of collectFiles(root)) {
        const source = readFileSync(file, "utf8");
        if (source.includes("masterclass-announcement-banner") || source.includes("MasterclassAnnouncementBanner")) {
          offenders.push(file);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
