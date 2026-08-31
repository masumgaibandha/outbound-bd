import { auth } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import type { Role } from "@/lib/roles";

let counter = 0;

/**
 * Creates a real user via Better Auth's own sign-up flow (never a hand-
 * rolled DB insert) and returns a `Cookie` header usable against route
 * handlers, so tests exercise the exact same session/cookie mechanics
 * production requests do. Promotes to ADMIN afterward the same way the
 * README documents doing it for real accounts — direct field update,
 * never trusted from client input.
 */
export async function createTestSession(options: { role?: Role } = {}) {
  counter += 1;
  const email = `qa-test-${Date.now()}-${counter}-${Math.random().toString(36).slice(2)}@example.test`;
  const password = "Qa-Test-Password-123!";

  const result = await auth.api.signUpEmail({
    body: { email, password, name: "QA Test User" },
    returnHeaders: true,
  });

  const setCookies = result.headers.getSetCookie();
  const cookieHeader = setCookies.map((cookie) => cookie.split(";")[0]).join("; ");

  if (options.role === "ADMIN") {
    await getDb().collection("user").updateOne({ email }, { $set: { role: "ADMIN" } });
  }

  return {
    userId: result.response.user.id as string,
    email,
    cookieHeader,
  };
}

export function withCookie(init: RequestInit, cookieHeader: string): RequestInit {
  const headers = new Headers(init.headers);
  headers.set("cookie", cookieHeader);
  return { ...init, headers };
}
