import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

import type { auth } from "@/lib/auth";
import { publicEnv } from "@/lib/public-env";

export const authClient = createAuthClient({
  baseURL: publicEnv.NEXT_PUBLIC_APP_URL,
  plugins: [inferAdditionalFields<typeof auth>()],
});

export const { useSession, signIn, signUp, signOut } = authClient;
