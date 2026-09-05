/**
 * One-time backfill: create a permanent Student for every distinct
 * `emailNormalized` among ENROLLED registrations, then link every matching
 * registration and every one of its payment orders (regardless of that
 * order's own status — PAID, REJECTED, or otherwise) to that Student.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/migrations/0001-backfill-students.ts
 *     -> DRY RUN (default). Reads only. Prints aggregate counts and
 *        ObjectIds — never a name, email, or phone number.
 *   npx tsx --env-file=.env.local scripts/migrations/0001-backfill-students.ts --apply
 *     -> Performs the actual backfill writes.
 *
 * WARNING — READ BEFORE RUNNING:
 * Creating and reviewing this file is authorized. Running it — in ANY
 * mode, including dry-run, against a Production MONGODB_URI — is a
 * SEPARATE decision that requires its own explicit authorization. Nothing
 * about this file existing, or about it having been reviewed, constitutes
 * that authorization.
 *
 * Safety properties:
 * - Genuinely read-only in dry-run mode: every operation this function
 *   performs when `apply` is false is a `find`/`aggregate`/`countDocuments`/
 *   `findOne` — never an `insertOne`, `updateOne`, `updateMany`,
 *   `findOneAndUpdate`, `createIndex`, or `createCollection`. This module
 *   never imports any repository file (`students-repository.ts`,
 *   `registrations-repository.ts`, `payment-orders-repository.ts`) —
 *   only those files' own lazy `ensureIndexes()` calls could ever create an
 *   index as a side effect of first use, and this script deliberately
 *   avoids importing them, operating on plain `Db`/`Collection` handles
 *   instead. See `tests/lib/masterclass-backfill-migration.test.ts` for an
 *   automated before/after snapshot proving zero writes in dry-run mode.
 * - Idempotent and resumable: every write uses a `studentId: { $exists: false }`
 *   guard, so re-running after a partial failure never re-processes an
 *   already-linked registration or order, and never creates a second
 *   Student for an email that already has one.
 * - Never assumes one order per registration: orders are linked via
 *   `updateMany({ registrationId: { $in: [...] } })`, matching every order
 *   a registration has ever accumulated (e.g. a rejected-then-retried
 *   payment history), not just the most recent one.
 * - Grouping and the canonical-name/phone tie-break happen server-side via
 *   one aggregation pipeline, never by pulling every registration document
 *   into process memory.
 */
import { fileURLToPath } from "node:url";
import { MongoClient, ObjectId, type Db } from "mongodb";

import { generateRandomStudentId } from "@/lib/masterclass/student-refs";

const BATCH_SIZE = 200;

interface StudentGroup {
  _id: string; // emailNormalized
  registrationIds: ObjectId[];
  canonicalName: string;
  canonicalPhone: string;
  canonicalPhoneE164: string;
  canonicalEmail: string;
  count: number;
}

export interface BackfillOptions {
  apply: boolean;
}

export interface BackfillSummary {
  apply: boolean;
  distinctEmails: number;
  skippedAlreadyLinked: number;
  wouldCreate?: number;
  wouldReuse?: number;
  created?: number;
  reused?: number;
  registrationsLinked?: number;
  ordersLinked?: number;
}

/**
 * The entire migration's logic, operating on a caller-supplied `Db` handle
 * — never opens its own connection, never reads `process.env` itself, and
 * never imports a repository file. This is what makes it safely testable
 * against an in-memory database: the caller decides which database this
 * touches. `log` defaults to `console.log`/`console.warn` for the real CLI
 * entry point below; tests inject a no-op or spy instead.
 */
export async function runBackfillStudents(
  db: Db,
  options: BackfillOptions,
  log: { info: (msg: string) => void; warn: (msg: string) => void } = {
    info: (msg) => console.log(msg),
    warn: (msg) => console.warn(msg),
  },
): Promise<BackfillSummary> {
  const { apply } = options;
  const registrations = db.collection("masterclass_registrations");
  const orders = db.collection("payment_orders");
  const students = db.collection("masterclass_students");

  log.info(`=== 0001-backfill-students: ${apply ? "APPLY (writes enabled)" : "DRY RUN (read-only)"} ===`);
  if (apply) {
    log.warn(
      "WARNING: --apply performs real writes. Running this against a Production MONGODB_URI requires separate, explicit authorization beyond running this script.",
    );
  }

  /*
   * Grouping + the canonical-row tie-break both happen in one server-side
   * aggregation: sort so the most recently UPDATED registration comes
   * first (ties broken by most recently CREATED, then by the largest
   * _id for full determinism), then `$first` picks that row's name/phone
   * as canonical per email group. No individual registration document
   * — and no name/email/phone — ever reaches this script's own memory
   * outside of what's already aggregated into `canonicalName`/etc. below,
   * which this script deliberately never logs.
   */
  const groups = await registrations
    .aggregate<StudentGroup>([
      { $match: { status: "ENROLLED" } },
      { $sort: { updatedAt: -1, createdAt: -1, _id: -1 } },
      {
        $group: {
          _id: "$emailNormalized",
          registrationIds: { $push: "$_id" },
          canonicalName: { $first: "$name" },
          canonicalPhone: { $first: "$phone" },
          canonicalPhoneE164: { $first: "$phoneE164" },
          canonicalEmail: { $first: "$email" },
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  const totalRegistrations = groups.reduce((sum, g) => sum + g.count, 0);
  log.info(`Scanned ${totalRegistrations} ENROLLED registration(s) across ${groups.length} distinct email(s).`);

  const multiRegistrationGroups = groups.filter((g) => g.count > 1);
  if (multiRegistrationGroups.length > 0) {
    log.info(`${multiRegistrationGroups.length} email(s) have more than one ENROLLED registration (multi-batch history):`);
    for (const g of multiRegistrationGroups) {
      log.info(`  - ${g.count} registrations: [${g.registrationIds.map((id) => id.toHexString()).join(", ")}]`);
    }
  }

  let wouldCreate = 0;
  let wouldReuse = 0;
  let created = 0;
  let reused = 0;
  let skippedAlreadyLinked = 0;
  let registrationsLinked = 0;
  let ordersLinked = 0;

  for (let i = 0; i < groups.length; i += BATCH_SIZE) {
    const batch = groups.slice(i, i + BATCH_SIZE);

    for (const group of batch) {
      const registrationIds = group.registrationIds;

      const unlinkedCount = await registrations.countDocuments({
        _id: { $in: registrationIds },
        studentId: { $exists: false },
      });
      if (unlinkedCount === 0) {
        skippedAlreadyLinked++;
        continue;
      }

      // Read-only in every mode — safe during a dry run, and needed in
      // apply mode only to report created-vs-reused accurately.
      const existingStudent = await students.findOne({ emailNormalized: group._id }, { projection: { _id: 1 } });

      if (!apply) {
        if (existingStudent) wouldReuse++;
        else wouldCreate++;
        continue;
      }

      const now = new Date();
      const studentResult = await students.findOneAndUpdate(
        { emailNormalized: group._id },
        {
          $set: {
            name: group.canonicalName,
            phone: group.canonicalPhone,
            phoneE164: group.canonicalPhoneE164,
            updatedAt: now,
          },
          $setOnInsert: {
            publicStudentId: generateRandomStudentId(),
            email: group.canonicalEmail,
            emailNormalized: group._id,
            status: "ACTIVE",
            mergedIntoStudentId: null,
            firstEnrolledAt: now,
            createdAt: now,
          },
        },
        { upsert: true, returnDocument: "after" },
      );
      if (!studentResult?._id) {
        throw new Error(`Student upsert returned no document for a registration group (${registrationIds.length} registrations).`);
      }

      if (studentResult.createdAt.getTime() === now.getTime()) created++;
      else reused++;

      const regLinkResult = await registrations.updateMany(
        { _id: { $in: registrationIds }, studentId: { $exists: false } },
        { $set: { studentId: studentResult._id, updatedAt: now } },
      );
      registrationsLinked += regLinkResult.modifiedCount;

      // Every order for these registrations, regardless of its own
      // status (PAID, REJECTED, or otherwise) — never assumes one order
      // per registration.
      const orderLinkResult = await orders.updateMany(
        { registrationId: { $in: registrationIds }, studentId: { $exists: false } },
        { $set: { studentId: studentResult._id, updatedAt: now } },
      );
      ordersLinked += orderLinkResult.modifiedCount;
    }

    log.info(
      `Processed batch ${Math.floor(i / BATCH_SIZE) + 1} (${Math.min(i + BATCH_SIZE, groups.length)}/${groups.length} distinct emails).`,
    );
  }

  const summary: BackfillSummary = apply
    ? { apply, distinctEmails: groups.length, created, reused, skippedAlreadyLinked, registrationsLinked, ordersLinked }
    : { apply, distinctEmails: groups.length, wouldCreate, wouldReuse, skippedAlreadyLinked };

  log.info("=== Summary ===");
  log.info(JSON.stringify(summary, null, 2));

  return summary;
}

function parseArgs(): BackfillOptions {
  return { apply: process.argv.includes("--apply") };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");

  const client = new MongoClient(uri);
  await client.connect();
  try {
    await runBackfillStudents(client.db(), options);
  } finally {
    await client.close();
  }
}

// Only runs when this file is executed directly (the real CLI entry point)
// — never as a side effect of another module importing `runBackfillStudents`
// for testing, which is exactly what tests/lib/masterclass-backfill-migration.test.ts does.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error("MIGRATION_ERROR", error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
