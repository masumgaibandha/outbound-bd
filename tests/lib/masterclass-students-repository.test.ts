// Must be the first import — sets MONGODB_URI to an isolated in-memory
// instance before env.ts / mongoose.ts / any masterclass module is
// imported. A plain client session (not a multi-document transaction) works
// fine against a standalone instance — only `session.withTransaction()`
// needs a replica set, and `upsertStudentForApproval()` performs exactly
// one write per call.
import { mongod } from "../helpers/mongodb-memory-server";

import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { getMongoClient } from "@/lib/masterclass/db";
import { connectToDatabase } from "@/lib/mongoose";
import { PUBLIC_STUDENT_ID_PATTERN } from "@/lib/masterclass/student-refs";
import { countStudents, STUDENTS_COLLECTION, upsertStudentForApproval } from "@/lib/masterclass/students-repository";

beforeAll(async () => {
  await connectToDatabase();
});

beforeEach(async () => {
  const connection = await connectToDatabase();
  await connection.connection.db?.collection(STUDENTS_COLLECTION).deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

async function withSession<T>(fn: (session: import("mongodb").ClientSession) => Promise<T>): Promise<T> {
  const client = await getMongoClient();
  const session = client.startSession();
  try {
    return await fn(session);
  } finally {
    await session.endSession();
  }
}

describe("upsertStudentForApproval", () => {
  it("creates a new Student on first call, with a valid publicStudentId", async () => {
    const student = await withSession((session) =>
      upsertStudentForApproval(
        {
          name: "Test Student",
          email: "student@example.com",
          emailNormalized: "student@example.com",
          phone: "01712345678",
          phoneE164: "+8801712345678",
        },
        session,
      ),
    );

    expect(student.publicStudentId).toMatch(PUBLIC_STUDENT_ID_PATTERN);
    expect(student.emailNormalized).toBe("student@example.com");
    expect(student.status).toBe("ACTIVE");
    expect(await countStudents()).toBe(1);
  });

  it("reuses the same Student on a second call for the same email, updating name/phone but never publicStudentId, emailNormalized, or firstEnrolledAt", async () => {
    const first = await withSession((session) =>
      upsertStudentForApproval(
        {
          name: "Original Name",
          email: "student@example.com",
          emailNormalized: "student@example.com",
          phone: "01712345678",
          phoneE164: "+8801712345678",
        },
        session,
      ),
    );

    const second = await withSession((session) =>
      upsertStudentForApproval(
        {
          name: "Updated Name",
          email: "student@example.com",
          emailNormalized: "student@example.com",
          phone: "01799999999",
          phoneE164: "+8801799999999",
        },
        session,
      ),
    );

    expect(await countStudents()).toBe(1);
    expect(second._id?.toHexString()).toBe(first._id?.toHexString());
    expect(second.publicStudentId).toBe(first.publicStudentId);
    expect(second.firstEnrolledAt.getTime()).toBe(first.firstEnrolledAt.getTime());
    expect(second.name).toBe("Updated Name");
    expect(second.phone).toBe("01799999999");
    expect(second.phoneE164).toBe("+8801799999999");
  });

  it("allows two different students to share the same phone number", async () => {
    const a = await withSession((session) =>
      upsertStudentForApproval(
        { name: "Student A", email: "a@example.com", emailNormalized: "a@example.com", phone: "01700000000", phoneE164: "+8801700000000" },
        session,
      ),
    );
    const b = await withSession((session) =>
      upsertStudentForApproval(
        { name: "Student B", email: "b@example.com", emailNormalized: "b@example.com", phone: "01700000000", phoneE164: "+8801700000000" },
        session,
      ),
    );

    expect(a._id?.toHexString()).not.toBe(b._id?.toHexString());
    expect(a.phoneE164).toBe(b.phoneE164);
    expect(await countStudents()).toBe(2);
  });
});
