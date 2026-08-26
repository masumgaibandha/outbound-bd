// Shared by both server code (session.ts) and client auth forms. Deliberately
// NOT "server-only" — it must be importable from "use client" components.

// The only legitimate post-login destinations. Restricting to these (rather
// than "any same-origin relative path") is defense in depth: `redirectTo` is
// round-tripped through a query string an attacker could craft and send to a
// victim, so it must never be able to point anywhere outside the app.
const SAFE_REDIRECT_PREFIXES = ["/dashboard", "/admin"];

/**
 * Validates an untrusted `redirectTo` value (e.g. from a URL query param)
 * against an allowlist of known-safe, same-origin destinations. Rejects
 * absolute URLs, protocol-relative URLs (`//evil.com`), backslash tricks
 * (`/\evil.com`, which some browsers normalize to `//evil.com`), and any
 * path outside the allowlist. Returns the validated path, or `null`.
 */
export function getSafeRedirectPath(
  candidate: string | null | undefined,
): string | null {
  if (!candidate) {
    return null;
  }
  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.startsWith("/\\")
  ) {
    return null;
  }
  const isAllowed = SAFE_REDIRECT_PREFIXES.some(
    (prefix) => candidate === prefix || candidate.startsWith(`${prefix}/`),
  );
  return isAllowed ? candidate : null;
}
