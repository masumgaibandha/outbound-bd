import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * Round 3 requirement: no em dash (U+2014) or en dash (U+2013) anywhere in
 * user-facing copy on the public agency site. Scans only actual runtime
 * string/text content (string literals, template literal spans, JSX text)
 * via the TypeScript AST, never raw file source, so code comments (which
 * are free to keep using dashes) can never trip this test. Masterclass is
 * out of scope entirely — a live ad campaign runs on it, see AGENTS.md/
 * CLAUDE.md task instructions for this round.
 */

const ROOT = path.resolve(__dirname, "../..");
const DASH_PATTERN = /[–—]/;

// Every directory whose copy is in scope for the "no em/en dash" rule.
const SCOPE_DIRS = [
  "src/components/public",
  "src/app/(public)",
  "src/components/agencies",
  "src/app/agencies",
];

// Individual files outside the directories above that still carry
// user-facing agency copy (the pricing catalog, the two agency email
// builders).
const SCOPE_FILES = [
  "src/lib/pricing-catalog.ts",
  "src/lib/agency-auto-reply.ts",
  "src/lib/contact-notification.ts",
];

// Files inside an in-scope directory that are deliberately excluded: a live
// ad campaign is running on the masterclass banner, so its copy is left
// alone by this round and shouldn't be coupled to this guard.
const EXCLUDED_FILES = new Set(["src/components/public/masterclass-announcement-banner.tsx"]);

function toRelative(fullPath: string): string {
  return path.relative(ROOT, fullPath).split(path.sep).join("/");
}

function walk(dir: string, acc: string[]): void {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, acc);
    } else if (/\.tsx?$/.test(entry)) {
      acc.push(full);
    }
  }
}

function scopeFiles(): string[] {
  const acc: string[] = [];
  for (const dir of SCOPE_DIRS) walk(path.join(ROOT, dir), acc);
  for (const file of SCOPE_FILES) acc.push(path.join(ROOT, file));
  return Array.from(new Set(acc.map(toRelative)))
    .filter((file) => !EXCLUDED_FILES.has(file))
    .sort();
}

/** Every runtime string/text value in the file: string literals, template
 * literal segments, and JSX text. Deliberately does not visit comments or
 * type-level-only positions any differently — but comments are never
 * visited at all, since `ts.forEachChild` only walks real AST nodes, never
 * trivia. */
function collectUserFacingStrings(fullPath: string): string[] {
  const source = readFileSync(fullPath, "utf-8");
  const sourceFile = ts.createSourceFile(
    fullPath,
    source,
    ts.ScriptTarget.Latest,
    true,
    fullPath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const values: string[] = [];

  function visit(node: ts.Node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      values.push(node.text);
    } else if (ts.isTemplateExpression(node)) {
      values.push(node.head.text);
      for (const span of node.templateSpans) {
        values.push(span.literal.text);
      }
    } else if (ts.isJsxText(node)) {
      values.push(node.text);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return values;
}

describe("agency site copy has no em dash or en dash", () => {
  const files = scopeFiles();

  it("scanned the expected in-scope files", () => {
    // Guards against a typo in SCOPE_DIRS silently making this suite a
    // no-op — the real count is well over 40 files as of Round 3.
    expect(files.length).toBeGreaterThan(40);
  });

  it.each(files)("%s", (relativePath) => {
    const values = collectUserFacingStrings(path.join(ROOT, relativePath));
    const offending = values.filter((value) => DASH_PATTERN.test(value));
    expect(offending, `em dash or en dash found in: ${JSON.stringify(offending)}`).toEqual([]);
  });
});

describe("agency OG image alt text has no em dash or en dash", () => {
  it("src/app/(public)/opengraph-image.alt.txt", () => {
    const text = readFileSync(path.join(ROOT, "src/app/(public)/opengraph-image.alt.txt"), "utf-8");
    expect(DASH_PATTERN.test(text)).toBe(false);
  });
});
