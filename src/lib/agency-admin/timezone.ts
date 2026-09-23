/**
 * Asia/Dhaka ("from"/"to" filters, dashboard date range) date-boundary math
 * for `/admin`. Bangladesh Standard Time is a fixed UTC+6 offset with no DST
 * (unchanged since 2009), so this never needs the `Intl` timezone database —
 * a plain 6-hour constant is correct and exact, not an approximation.
 *
 * Every function here is pure (no `process.env`, no `Date.now()` default
 * baked in silently) so it's trivially testable and reusable by the leads
 * repository, the dashboard aggregation, and the CSV export filename.
 */

const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** `true` only for a well-formed `YYYY-MM-DD` string — never throws on garbage input. */
export function isValidDateOnly(value: string): boolean {
  if (!DATE_ONLY_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const asDate = new Date(Date.UTC(year, month - 1, day));
  return (
    asDate.getUTCFullYear() === year &&
    asDate.getUTCMonth() === month - 1 &&
    asDate.getUTCDate() === day
  );
}

/** The UTC instant of 00:00:00.000 Asia/Dhaka on the given `YYYY-MM-DD` calendar date. */
export function dhakaDateOnlyToUtcStart(dateOnly: string): Date {
  const [year, month, day] = dateOnly.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) - DHAKA_OFFSET_MS);
}

/** The UTC instant just past 23:59:59.999 Asia/Dhaka on the given `YYYY-MM-DD` calendar date — i.e. the exclusive upper bound for a `$lt` range query. */
export function dhakaDateOnlyToUtcEndExclusive(dateOnly: string): Date {
  const [year, month, day] = dateOnly.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1) - DHAKA_OFFSET_MS);
}

/** Formats a UTC instant as its Asia/Dhaka calendar date, `YYYY-MM-DD`. */
export function utcInstantToDhakaDateOnly(instant: Date): string {
  const dhakaMs = instant.getTime() + DHAKA_OFFSET_MS;
  const dhaka = new Date(dhakaMs);
  const year = dhaka.getUTCFullYear();
  const month = String(dhaka.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dhaka.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export interface DhakaDateRange {
  from: string;
  to: string;
}

/** Default range for the dashboard and an unfiltered leads list: the last 30 days, inclusive, in Asia/Dhaka — `to` is always "today" in Dhaka. */
export function defaultDhakaDateRange(now: Date = new Date()): DhakaDateRange {
  const to = utcInstantToDhakaDateOnly(now);
  const fromInstant = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
  const from = utcInstantToDhakaDateOnly(fromInstant);
  return { from, to };
}

/** The fixed-offset equivalent of `"Asia/Dhaka"` accepted by MongoDB's `$dateToString`/`$dateTrunc` `timezone` option — kept as a UTC-offset string (not the IANA name) so the aggregation pipeline uses the exact same "always +6, no DST" assumption as every function above, rather than depending on the MongoDB server's own timezone database. */
export const DHAKA_UTC_OFFSET_STRING = "+06:00";

/**
 * The last `count` calendar months in Asia/Dhaka, as `"YYYY-MM"` keys,
 * oldest first, ending at `now`'s own Dhaka month (inclusive) — e.g.
 * `count: 6` on a Dhaka-September `now` returns April through September.
 * Pure and independent of any date-range filter the caller might also have
 * selected — the dashboard's "last 6 months" series is always the last 6
 * real months, not scoped to whatever range is showing elsewhere on the
 * page.
 */
export function lastNDhakaMonthKeys(count: number, now: Date = new Date()): string[] {
  const [year, month] = utcInstantToDhakaDateOnly(now).split("-").map(Number);
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    let y = year;
    let m = month - i;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    keys.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  return keys;
}
