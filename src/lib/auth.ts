import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";

import { authEnv } from "@/lib/auth-env";
import { getDb, mongoClient } from "@/lib/mongodb";
import { DEFAULT_ROLE } from "@/lib/roles";

export const auth = betterAuth({
  secret: authEnv.BETTER_AUTH_SECRET,
  baseURL: authEnv.BETTER_AUTH_URL,
  database: mongodbAdapter(getDb(), {
    client: mongoClient,
    // A plain standalone MongoDB instance (the local dev default) has no
    // replica set and can't run multi-document transactions. Enable this
    // once the target deployment (e.g. MongoDB Atlas) supports them.
    transaction: false,
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: DEFAULT_ROLE,
        // Role is assigned server-side only; never accepted from client input.
        input: false,
      },
    },
  },
  plugins: [nextCookies()],
});
