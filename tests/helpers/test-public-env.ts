// Import this FIRST (before any module that transitively imports
// src/lib/public-env.ts) — public-env.ts validates NEXT_PUBLIC_APP_URL at
// module top-level, and native ESM evaluates all of a file's imports
// before any of that file's own top-level statements run, so setting the
// env var inline in the test file itself would run too late.
process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";

export {};
