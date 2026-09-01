import { z } from "zod";

// Deliberately NOT "server-only" — NEXT_PUBLIC_* variables are meant to be
// readable from the browser bundle. Used for the site's canonical URL
// (metadataBase, sitemap.ts, robots.ts). Validated separately from env.ts
// so a problem here never fails a build for routes that don't need it.
const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
});

const parsed = publicEnvSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

if (!parsed.success) {
  throw new Error(
    `Invalid public app environment variables:\n${JSON.stringify(z.treeifyError(parsed.error), null, 2)}`,
  );
}

export const publicEnv = parsed.data;
