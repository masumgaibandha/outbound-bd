import "server-only";

import { z } from "zod";

// Scoped to exactly what blob-storage.ts needs, following the same
// per-concern validation pattern as env.ts / auth-env.ts.
const blobEnvSchema = z.object({
  BLOB_READ_WRITE_TOKEN: z.string().min(1, "BLOB_READ_WRITE_TOKEN is required"),
});

const parsed = blobEnvSchema.safeParse({
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
});

if (!parsed.success) {
  throw new Error(
    `Invalid Blob storage environment variables:\n${JSON.stringify(z.treeifyError(parsed.error), null, 2)}`,
  );
}

export const blobEnv = parsed.data;
