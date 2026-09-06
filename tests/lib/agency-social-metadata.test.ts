import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

const AGENCY_OG_IMAGE = path.resolve("src/app/(public)/opengraph-image.png");
const AGENCY_OG_ALT = path.resolve("src/app/(public)/opengraph-image.alt.txt");
const APPLE_ICON = path.resolve("src/app/apple-icon.png");
const APPLE_ICON_SOURCE = path.resolve("src/assets/logos/outbound-bd-favicon-180.png");
const MASTERCLASS_OG_IMAGE = path.resolve(
  "src/app/masterclass/lead-generation-cold-email/opengraph-image.tsx",
);
const LOGOS_DIR = path.resolve("src/assets/logos");
const ROOT_LAYOUT = path.resolve("src/app/layout.tsx");

function sha256(filePath: string) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

/**
 * Same "does this raster contain a genuinely blue-ish color" heuristic used
 * during the manual brand-asset audit: blue channel must clearly dominate
 * red, and the pixel must be reasonably saturated (rules out grays and warm
 * antialiasing blends that only incidentally tilt blue by a few units).
 */
async function countNavyishPixels(filePath: string) {
  const { data, info } = await sharp(filePath).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  let count = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 10) continue;
    if (b <= r + 15) continue;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    if (sat < 0.15) continue;
    count++;
  }
  return count;
}

describe("agency default Open Graph / Twitter image", () => {
  it("exists at the (public) route-group segment as a static file-convention image", () => {
    expect(existsSync(AGENCY_OG_IMAGE)).toBe(true);
  });

  it("is exactly 1200x630 with transparency support", async () => {
    const meta = await sharp(AGENCY_OG_IMAGE).metadata();
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(630);
    expect(meta.hasAlpha).toBe(true);
  });

  it("has a descriptive alt-text sidecar file naming the brand and the agency description", () => {
    expect(existsSync(AGENCY_OG_ALT)).toBe(true);
    const alt = readFileSync(AGENCY_OG_ALT, "utf-8").trim();
    expect(alt).toContain("Outbound BD");
    expect(alt.length).toBeGreaterThan(10);
  });

  it("contains no navy/royal-blue/azure pixels", async () => {
    const navyCount = await countNavyishPixels(AGENCY_OG_IMAGE);
    expect(navyCount).toBe(0);
  });
});

describe("apple-touch icon", () => {
  it("exists at the app-wide root segment", () => {
    expect(existsSync(APPLE_ICON)).toBe(true);
  });

  it("is exactly 180x180", async () => {
    const meta = await sharp(APPLE_ICON).metadata();
    expect(meta.width).toBe(180);
    expect(meta.height).toBe(180);
  });

  it("is byte-identical (SHA-256) to the approved 180px favicon export — copied, never resampled", () => {
    expect(existsSync(APPLE_ICON_SOURCE)).toBe(true);
    expect(sha256(APPLE_ICON)).toBe(sha256(APPLE_ICON_SOURCE));
  });
});

describe("masterclass route keeps its own distinct social image", () => {
  it("still has its own opengraph-image route file, separate from the new agency default", () => {
    expect(existsSync(MASTERCLASS_OG_IMAGE)).toBe(true);
  });
});

describe("no rejected navy/blue branding introduced", () => {
  it("has no navy/royal/azure/blue filenames anywhere in the brand asset directory", () => {
    const stale = readdirSync(LOGOS_DIR).filter((f) => /navy|royal|azure|blue/i.test(f));
    expect(stale).toEqual([]);
  });
});

describe("agency metadata canonical origin", () => {
  it("root layout derives metadataBase only from the validated NEXT_PUBLIC_APP_URL — no hardcoded domain", () => {
    const source = readFileSync(ROOT_LAYOUT, "utf-8");
    expect(source).toContain("metadataBase: new URL(publicEnv.NEXT_PUBLIC_APP_URL)");
    expect(source).not.toMatch(/vercel\.app/);
  });

  it("resolves to the canonical https://outboundbd.com origin when NEXT_PUBLIC_APP_URL is the real Production value", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://outboundbd.com");
    const { publicEnv } = await import("@/lib/public-env");
    expect(new URL(publicEnv.NEXT_PUBLIC_APP_URL).origin).toBe("https://outboundbd.com");
    vi.unstubAllEnvs();
  });
});
