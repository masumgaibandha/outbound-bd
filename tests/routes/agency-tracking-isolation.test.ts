import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The agency Meta Pixel (`TrackingGate`/`MetaPixel` under
 * `src/components/public/`) must never load on `/masterclass/**` — the
 * masterclass tree has its own, separate, unconditional Meta Pixel
 * (`src/components/masterclass/MetaPixel.tsx`) and must stay untouched.
 * Structurally this already holds because `TrackingGate` is rendered only
 * from `src/app/(public)/layout.tsx`, a route group masterclass never
 * shares — this file asserts that invariant directly, the same fs-based
 * style as `tests/routes/masterclass-admin-isolation.test.ts` and
 * `tests/routes/removed-routes.test.ts`, so a future edit that accidentally
 * imports the agency tracking components into the masterclass tree fails a
 * fast, obvious test instead of silently double-firing two pixels.
 */
const projectRoot = path.resolve(__dirname, "../..");

const FORBIDDEN_IMPORT_PATTERNS = [
  "components/public/tracking-gate",
  "components/public/meta-pixel",
  "lib/tracking/",
];

function readAllSourceFiles(dir: string): { path: string; content: string }[] {
  const relativePaths = readdirSync(dir, { recursive: true }) as string[];
  const files: { path: string; content: string }[] = [];
  for (const relativePath of relativePaths) {
    if (!/\.(ts|tsx)$/.test(relativePath)) continue;
    const filePath = path.join(dir, relativePath);
    files.push({ path: filePath, content: readFileSync(filePath, "utf-8") });
  }
  return files;
}

describe("agency Meta Pixel/CAPI tracking stays out of the masterclass tree", () => {
  it("no file under src/app/masterclass imports the agency tracking-gate, meta-pixel, or lib/tracking modules", () => {
    const masterclassAppDir = path.join(projectRoot, "src/app/masterclass");
    const offenders: string[] = [];

    for (const { path: filePath, content } of readAllSourceFiles(masterclassAppDir)) {
      for (const forbidden of FORBIDDEN_IMPORT_PATTERNS) {
        if (content.includes(forbidden)) {
          offenders.push(`${path.relative(projectRoot, filePath)} references "${forbidden}"`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("no file under src/components/masterclass imports the agency tracking-gate, meta-pixel, or lib/tracking modules", () => {
    const masterclassComponentsDir = path.join(projectRoot, "src/components/masterclass");
    const offenders: string[] = [];

    for (const { path: filePath, content } of readAllSourceFiles(masterclassComponentsDir)) {
      for (const forbidden of FORBIDDEN_IMPORT_PATTERNS) {
        if (content.includes(forbidden)) {
          offenders.push(`${path.relative(projectRoot, filePath)} references "${forbidden}"`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("TrackingGate is rendered only from the (public) layout", () => {
    const publicLayout = readFileSync(
      path.join(projectRoot, "src/app/(public)/layout.tsx"),
      "utf-8",
    );
    expect(publicLayout).toContain("TrackingGate");

    const masterclassLayout = readFileSync(
      path.join(projectRoot, "src/app/masterclass/lead-generation-cold-email/layout.tsx"),
      "utf-8",
    );
    expect(masterclassLayout).not.toContain("TrackingGate");
  });
});
