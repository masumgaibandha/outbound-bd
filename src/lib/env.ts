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

const parsed = envSchema.safeParse({
  MONGODB_URI: process.env.MONGODB_URI,
});

if (!parsed.success) {
  throw new Error(
    `Invalid database environment variables:\n${JSON.stringify(z.treeifyError(parsed.error), null, 2)}`,
  );
}

export const env = parsed.data;
