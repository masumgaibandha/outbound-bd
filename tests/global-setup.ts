import { MongoMemoryServer } from "mongodb-memory-server";

// Runs once before the whole test run, in the main Vitest process — this is
// the only place it's safe to set process.env.* before any test file (or
// the app modules they import) evaluates env.ts / auth-env.ts / etc., which
// validate their variables at import time.
//
// Deliberately never touches MONGODB_URI from .env* — a Vercel-linked
// checkout's .env.local typically holds the *production* Atlas connection
// string (pulled via `vercel env pull`), and tests must never be able to
// reach it, accidentally or otherwise. This in-memory instance is the only
// database tests ever see.
let mongod: MongoMemoryServer | undefined;

export async function setup() {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri("outbound-bd-test");
  process.env.BETTER_AUTH_SECRET = "vitest-only-secret-vitest-only-secret-32";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  // Never a real token — Blob access itself is mocked per-test
  // (tests/fakes/blob-storage-fake.ts); this only satisfies blob-env.ts's
  // startup validation for any module that imports it.
  process.env.BLOB_READ_WRITE_TOKEN = "vitest-fake-token-not-real";
}

export async function teardown() {
  await mongod?.stop();
}
