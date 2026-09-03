import "server-only";

import { z } from "zod";

// Scoped to exactly what mongodb.ts / mongoose.ts need. Kept separate from
// auth-env.ts and public-env.ts so a misconfigured Better Auth or public-URL
// variable can never fail the build for a route that only touches the
// database (e.g. /api/inquiries) — each concern validates independently,
// right where it's actually consumed.
const envSchema = z.object({
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
});

/**
 * Validated lazily, only when actually called — never at module import
 * time. `mongoose.ts` (and transitively every route that touches the
 * database, agency and masterclass alike) imports this module at its own
 * top level, so an eager, import-time validation here would crash the
 * *entire* build the moment MONGODB_URI is unset in any environment that
 * doesn't happen to have it configured — not just fail the one route that
 * actually needs it. Confirmed via a local Preview-environment build
 * reproduction (isolated worktree, no real MONGODB_URI) — see the
 * feat/masterclass-migration Preview-deployment diagnosis. Every call
 * re-validates (cheap — one Zod string check) rather than caching, so this
 * never masks a value that changes between calls.
 */
export function getDatabaseEnv(): { MONGODB_URI: string } {
  const parsed = envSchema.safeParse({
    MONGODB_URI: process.env.MONGODB_URI,
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid database environment variables:\n${JSON.stringify(z.treeifyError(parsed.error), null, 2)}`,
    );
  }

  return parsed.data;
}
