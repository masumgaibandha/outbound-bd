/**
 * Same regex-based read as `MasterclassRegistrationForm.tsx`'s local
 * `readCookie()` (used there for `_fbp`/`_fbc`), factored out here so the
 * agency contact form, `TrackingGate`, and Round 2's second form can all
 * share one implementation instead of re-deriving it.
 */
export function readBrowserCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function writeBrowserCookie(
  name: string,
  value: string,
  options: { maxAgeDays: number },
): void {
  if (typeof document === "undefined") return;
  const maxAgeSeconds = options.maxAgeDays * 24 * 60 * 60;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}
