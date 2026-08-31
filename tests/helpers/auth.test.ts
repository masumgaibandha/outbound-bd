import { describe, expect, it } from "vitest";

import { auth } from "@/lib/auth";
import { createTestSession, withCookie } from "./auth";

describe("createTestSession helper", () => {
  it("produces a cookie that Better Auth recognizes as a real session", async () => {
    const { email, cookieHeader, userId } = await createTestSession();
    expect(cookieHeader.length).toBeGreaterThan(0);

    const request = withCookie({}, cookieHeader);
    const session = await auth.api.getSession({ headers: new Headers(request.headers) });

    expect(session?.user.email).toBe(email);
    expect(session?.user.id).toBe(userId);
    expect(session?.user.role).toBe("CLIENT");
  });

  it("promotes to ADMIN when requested", async () => {
    const { cookieHeader } = await createTestSession({ role: "ADMIN" });
    const session = await auth.api.getSession({ headers: new Headers(withCookie({}, cookieHeader).headers) });
    expect(session?.user.role).toBe("ADMIN");
  });
});
