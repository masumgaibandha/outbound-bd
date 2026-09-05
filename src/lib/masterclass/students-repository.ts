import type { ClientSession, Collection } from "mongodb";

import { getDb } from "@/lib/masterclass/db";
import { PublicStudentIdCollisionError, StudentEmailRaceError } from "@/lib/masterclass/errors";
import { generateRandomStudentId } from "@/lib/masterclass/student-refs";
import type { StudentDocument } from "@/types/masterclass-persistence";

export const STUDENTS_COLLECTION = "masterclass_students";

let indexesEnsured: Promise<void> | undefined;

async function ensureIndexes(collection: Collection<StudentDocument>): Promise<void> {
  indexesEnsured ??= (async () => {
    await Promise.all([
      collection.createIndex({ emailNormalized: 1 }, { unique: true, name: "uniq_student_email" }),
      collection.createIndex({ publicStudentId: 1 }, { unique: true, name: "uniq_public_student_id" }),
      /* Explicitly non-unique — a phone number can legitimately belong to more than one student (e.g. a guardian registering multiple learners). */
      collection.createIndex({ phoneE164: 1 }, { name: "phone_lookup" }),
    ]);
  })();
  return indexesEnsured;
}

async function getCollection(): Promise<Collection<StudentDocument>> {
  const db = await getDb();
  const collection = db.collection<StudentDocument>(STUDENTS_COLLECTION);
  await ensureIndexes(collection);
  return collection;
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  );
}

/**
 * Classifies a duplicate-key error by the MongoDB driver's own `keyPattern`
 * — never inferred by re-reading the database on this (now-aborted)
 * session, matching the exact discipline `registrations-repository.ts`
 * already documents for `publicRegistrationRef` collisions.
 */
function isPublicStudentIdCollision(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const keyPattern = (error as { keyPattern?: unknown }).keyPattern;
  if (keyPattern && typeof keyPattern === "object" && "publicStudentId" in keyPattern) {
    return true;
  }
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message.includes("uniq_public_student_id");
}

function isStudentEmailCollision(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const keyPattern = (error as { keyPattern?: unknown }).keyPattern;
  if (keyPattern && typeof keyPattern === "object" && "emailNormalized" in keyPattern) {
    return true;
  }
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message.includes("uniq_student_email");
}

export interface UpsertStudentForApprovalInput {
  name: string;
  email: string;
  emailNormalized: string;
  phone: string;
  phoneE164: string;
}

/**
 * One attempt per call — never loops or re-reads internally, the exact
 * same in-transaction-safety shape as `upsertRegistration()`. On a match
 * (a returning student, any prior batch), updates only `name`/`phone`/
 * `phoneE164` — `publicStudentId`, `emailNormalized`, and `firstEnrolledAt`
 * are `$setOnInsert`-only and therefore never touched on a match. On a
 * genuine insert, a freshly generated `publicStudentId` collision or a
 * concurrent approval's `emailNormalized` race both surface as a real
 * duplicate-key error here — classified via `keyPattern` and thrown as a
 * distinct, driver-independent error type so `approvePayment()`'s outer
 * bounded retry loop (verify-service.ts) can start a brand-new
 * session/transaction, never re-read on this one.
 */
export async function upsertStudentForApproval(
  input: UpsertStudentForApprovalInput,
  session: ClientSession,
): Promise<StudentDocument> {
  const collection = await getCollection();
  const now = new Date();
  const candidateId = generateRandomStudentId();

  try {
    const updated = await collection.findOneAndUpdate(
      { emailNormalized: input.emailNormalized },
      {
        $set: { name: input.name, phone: input.phone, phoneE164: input.phoneE164, updatedAt: now },
        $setOnInsert: {
          publicStudentId: candidateId,
          email: input.email,
          emailNormalized: input.emailNormalized,
          status: "ACTIVE",
          mergedIntoStudentId: null,
          firstEnrolledAt: now,
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: "after", session },
    );
    if (!updated) {
      throw new Error("Student upsert returned no document.");
    }
    return updated;
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    if (isPublicStudentIdCollision(error)) throw new PublicStudentIdCollisionError();
    if (isStudentEmailCollision(error)) throw new StudentEmailRaceError();
    throw error;
  }
}

/** Derived from the collection itself — never inferred from a count of generated IDs. */
export async function countStudents(): Promise<number> {
  const collection = await getCollection();
  return collection.countDocuments({});
}

export interface StudentListRow {
  publicStudentId: string;
  name: string;
  email: string;
  phone: string;
  firstEnrolledAt: Date;
  enrollmentCount: number;
}

export interface ListStudentsPageResult {
  students: StudentListRow[];
  totalCount: number;
}

/**
 * Offset-paginated, deterministic order (`firstEnrolledAt` desc, `_id` desc
 * as a tiebreaker so two students enrolled in the same millisecond still
 * sort stably). `page`/`pageSize` must already be validated/clamped by the
 * caller (the admin route) — this function trusts them as plain numbers,
 * never a raw query/sort/regex from the URL.
 */
export async function listStudentsPage(page: number, pageSize: number): Promise<ListStudentsPageResult> {
  const collection = await getCollection();
  const skip = (page - 1) * pageSize;

  const [rows, totalCount] = await Promise.all([
    collection
      .aggregate<{
        publicStudentId: string;
        name: string;
        email: string;
        phone: string;
        firstEnrolledAt: Date;
        enrollmentCount: number;
      }>([
        { $sort: { firstEnrolledAt: -1, _id: -1 } },
        { $skip: skip },
        { $limit: pageSize },
        {
          $lookup: {
            from: "masterclass_registrations",
            localField: "_id",
            foreignField: "studentId",
            as: "enrollments",
          },
        },
        {
          $project: {
            publicStudentId: 1,
            name: 1,
            email: 1,
            phone: 1,
            firstEnrolledAt: 1,
            enrollmentCount: { $size: "$enrollments" },
          },
        },
      ])
      .toArray(),
    collection.countDocuments({}),
  ]);

  return { students: rows, totalCount };
}
