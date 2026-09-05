/**
 * Shared server-side pagination clamp for the admin Students/Enrollments
 * pages. Accepts only a plain page NUMBER from the URL — never a raw
 * MongoDB query, sort expression, or regex. `pageSize` is fixed, not
 * client-adjustable, so a caller can never request an unbounded page.
 */
export const ADMIN_PAGE_SIZE = 50;

const MAX_PAGE = 100_000; // sane upper bound — well beyond any realistic dataset, just enough to reject an absurd/malicious skip value

/** `raw` is untrusted request input — always returns a finite integer `>= 1`. */
export function parsePageParam(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, MAX_PAGE);
}
