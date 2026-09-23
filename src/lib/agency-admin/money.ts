/**
 * The single place money is ever formatted for display in `/admin`. Every
 * amount is stored and summed as an integer number of cents (a whole
 * `number` — JS has no separate integer type, but as long as nothing ever
 * divides by 100 before this point, no operation here is exposed to
 * floating-point rounding: integer addition/subtraction of cents is exact
 * for any realistic agency revenue, well under `Number.MAX_SAFE_INTEGER`).
 * The one division by 100 happens here, once, purely for rendering — never
 * feed the result of `formatCents()` back into further arithmetic.
 */

/** USD only for now (see `ClientDocument.currency`) — `currency` is still a parameter so a future non-USD amount fails loudly instead of silently mislabeling itself. */
export function formatCents(cents: number, currency: "USD" = "USD"): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * The only place an average is computed — one integer division, rounded
 * once, right here. `totalCents` and `count` must both already be exact
 * integers (a sum of cents, and a plain count) for this to be exact;
 * `Math.round` is the single, deliberate rounding step "at display time"
 * the money rules call for, not an intermediate one a caller might
 * accidentally sum again.
 */
export function averageCents(totalCents: number, count: number): number {
  if (count <= 0) return 0;
  return Math.round(totalCents / count);
}

const DOLLARS_INPUT_PATTERN = /^\d+(\.\d{1,2})?$/;

/**
 * Every money amount typed into a `/admin` form arrives as a dollars
 * string (e.g. `"499"` or `"499.99"`, whatever an `<input type="number"
 * step="0.01">` submits) — this is the one place that string is turned into
 * an integer number of cents, via exact string splitting and `BigInt`
 * arithmetic, never `Number(dollars) * 100`. A float multiply can and does
 * misround real values (`19.99 * 100 === 1998.9999999999998` in JS), which
 * is exactly the class of bug the money rules forbid. Returns `null` for
 * anything that isn't a plain non-negative amount with at most 2 decimal
 * places, or that would overflow `Number.MAX_SAFE_INTEGER` in cents — the
 * caller treats `null` as a validation failure, same as any other bad
 * input.
 */
export function dollarsStringToCents(raw: string): number | null {
  const trimmed = raw.trim();
  if (!DOLLARS_INPUT_PATTERN.test(trimmed)) return null;

  const [wholePart, fractionPart = ""] = trimmed.split(".");
  const centsFromFraction = fractionPart.padEnd(2, "0");
  // `BigInt(100)`, not the `100n` literal syntax — this project's build
  // target predates literal BigInt syntax support; the function call form
  // is available regardless of target.
  const totalCents = BigInt(wholePart) * BigInt(100) + BigInt(centsFromFraction);

  if (totalCents > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(totalCents);
}
