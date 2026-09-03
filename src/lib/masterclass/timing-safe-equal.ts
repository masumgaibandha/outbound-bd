/**
 * Pure, dependency-free constant-time string comparison — deliberately no
 * `node:crypto` import so it works unchanged in both the Edge Runtime
 * (`proxy.ts`) and the Node.js runtime (`admin-auth.ts`). Ported
 * verbatim from the MasumDev masterclass source.
 *
 * Every character is compared regardless of where a mismatch occurs, so an
 * attacker can't learn how many leading characters they guessed correctly
 * from response timing.
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
