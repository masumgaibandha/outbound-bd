import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Static, source-level guarantee that the Meta Pixel and the tracking
 * consent banner can never load on `/admin` (Round 4A requirement) — an
 * internal staff tool, not a tracked marketing page. Rather than asserting
 * on rendered output (which only proves today's layout is clean), this
 * scans every source file actually reachable from the `/admin` route tree
 * for the forbidden imports, so a future page added under `src/app/admin`
 * or `src/components/admin` trips this test immediately if it ever imports
 * either one.
 */
const projectRoot = path.resolve(__dirname, "../..");

const FORBIDDEN_IMPORT_PATTERNS = [
  /from\s+["']@\/components\/public\/meta-pixel["']/,
  /from\s+["']@\/components\/public\/tracking-gate["']/,
  /from\s+["']@\/components\/public\/tracking-consent-banner["']/,
  /from\s+["']@\/components\/masterclass\/MetaPixel["']/,
];

function listFilesRecursive(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(fullPath));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("/admin never loads the Meta Pixel or a consent banner", () => {
  it("no source file under src/app/admin or src/components/admin imports a Pixel/consent component", () => {
    const files = [
      ...listFilesRecursive(path.join(projectRoot, "src/app/admin")),
      ...listFilesRecursive(path.join(projectRoot, "src/components/admin")),
    ];

    expect(files.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of files) {
      const contents = readFileSync(file, "utf-8");
      if (FORBIDDEN_IMPORT_PATTERNS.some((pattern) => pattern.test(contents))) {
        offenders.push(path.relative(projectRoot, file));
      }
    }

    expect(offenders).toEqual([]);
  });
});
