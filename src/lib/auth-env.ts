import "server-only";

import { z } from "zod";

// Scoped to exactly what auth.ts needs. Validated independently of
// env.ts (database) and public-env.ts (client-safe URL) so a problem in
// one never blocks a build that doesn't touch that concern.
const authEnvSchema = z.object({
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.url(),
});

const parsed = authEnvSchema.safeParse({
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
});

if (!parsed.success) {
  throw new Error(
    `Invalid Better Auth environment variables:\n${JSON.stringify(z.treeifyError(parsed.error), null, 2)}`,
  );
}

export const authEnv = parsed.data;
