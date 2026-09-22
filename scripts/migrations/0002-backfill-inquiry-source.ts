/**
 * One-time backfill: sets `source: "contact"` on every Inquiry document
 * that predates the Round 2 `source` field (see `src/lib/models/inquiry.ts`).
 *
 * The Mongoose schema also declares `source` with `default: "contact"`,
 * which covers every read that goes through the Mongoose model (`find`,
 * `findOne`, `create`, ...) — Mongoose applies schema defaults when
 * hydrating a document that's missing the field. But that default does NOT
 * apply to a raw query *filter*: `Inquiry.find({ source: "contact" })`
 * matches only documents that actually store `source: "contact"`, never
 * documents where the field is simply absent. It also does not apply to
 * `.lean()` reads, which skip document hydration (and therefore every
 * schema default) entirely. A Round 4 admin filter or a `.lean()` list view
 * would silently miss every pre-Round-2 document without this migration.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/migrations/0002-backfill-inquiry-source.ts
 *     -> DRY RUN (default). Read-only; reports how many documents would be
 *        updated. Never logs a name, email, or any other visitor-identifying
 *        field — only a count.
 *   npx tsx --env-file=.env.local scripts/migrations/0002-backfill-inquiry-source.ts --apply
 *     -> Performs the actual backfill write.
 *
 * WARNING — READ BEFORE RUNNING:
 * Creating and reviewing this file is authorized. Running it — in ANY mode,
 * including dry-run — against a Production MONGODB_URI is a SEPARATE
 * decision that requires its own explicit authorization. Nothing about this
 * file existing, or having been reviewed, constitutes that authorization.
 *
 * Safety properties:
 * - Genuinely read-only in dry-run mode: only ever calls `countDocuments`.
 * - Idempotent: the update filter is `{ source: { $exists: false } }`, so a
 *   document already backfilled — or any document created after Round 2,
 *   which always has `source` set by the application itself — is never
 *   re-touched. A second run always reports/updates zero documents.
 * - Scoped to exactly one field on one collection: no index creation, no
 *   other collection touched, no other field modified.
 */
import { fileURLToPath } from "node:url";
import { MongoClient, type Db } from "mongodb";

// Mongoose's default collection name for `model("Inquiry", ...)` — lowercased
// and pluralized ("Inquiry" -> "inquiries"). Deliberately not imported from
// src/lib/models/inquiry.ts: that file is "server-only" and importing it
// would register the Mongoose model (schema defaults/hooks included) as a
// side effect, which this script avoids — same reasoning as
// scripts/migrations/0001-backfill-students.ts's own doc comment, operating
// on a plain `Db`/`Collection` handle instead.
const INQUIRIES_COLLECTION = "inquiries";

export interface BackfillInquirySourceOptions {
  apply: boolean;
}

export interface BackfillInquirySourceSummary {
  apply: boolean;
  matched: number;
  modified?: number;
}

/**
 * The entire migration's logic, operating on a caller-supplied `Db` handle
 * — never opens its own connection, never reads `process.env` itself. This
 * is what makes it safely testable against an in-memory database: the
 * caller decides which database this touches. `log` defaults to
 * `console.log`/`console.warn` for the real CLI entry point below; tests
 * inject a no-op or spy instead.
 */
export async function runBackfillInquirySource(
  db: Db,
  options: BackfillInquirySourceOptions,
  log: { info: (msg: string) => void; warn: (msg: string) => void } = {
    info: (msg) => console.log(msg),
    warn: (msg) => console.warn(msg),
  },
): Promise<BackfillInquirySourceSummary> {
  const { apply } = options;
  const inquiries = db.collection(INQUIRIES_COLLECTION);

  log.info(`=== 0002-backfill-inquiry-source: ${apply ? "APPLY (writes enabled)" : "DRY RUN (read-only)"} ===`);
  if (apply) {
    log.warn(
      "WARNING: --apply performs real writes. Running this against a Production MONGODB_URI requires separate, explicit authorization beyond running this script.",
    );
  }

  const filter = { source: { $exists: false } };
  const matched = await inquiries.countDocuments(filter);
  log.info(`Found ${matched} Inquiry document(s) missing "source".`);

  if (!apply) {
    const summary: BackfillInquirySourceSummary = { apply, matched };
    log.info("=== Summary ===");
    log.info(JSON.stringify(summary, null, 2));
    return summary;
  }

  const result = await inquiries.updateMany(filter, { $set: { source: "contact" } });
  log.info(`Updated ${result.modifiedCount} document(s).`);

  const summary: BackfillInquirySourceSummary = { apply, matched, modified: result.modifiedCount };
  log.info("=== Summary ===");
  log.info(JSON.stringify(summary, null, 2));
  return summary;
}

function parseArgs(): BackfillInquirySourceOptions {
  return { apply: process.argv.includes("--apply") };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");

  const client = new MongoClient(uri);
  await client.connect();
  try {
    await runBackfillInquirySource(client.db(), options);
  } finally {
    await client.close();
  }
}

// Only runs when this file is executed directly (the real CLI entry point)
// — never as a side effect of another module importing
// `runBackfillInquirySource` for testing, which is exactly what
// tests/lib/inquiry-source-backfill-migration.test.ts does.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error("MIGRATION_ERROR", error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
