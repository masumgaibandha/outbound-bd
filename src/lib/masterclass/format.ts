const BENGALI_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function toBengaliDigits(value: string): string {
  return value.replace(/[0-9]/g, (digit) => BENGALI_DIGITS[Number(digit)]);
}

/**
 * The single place a BDT amount becomes a displayed price string. Deliberate
 * change from the original MasumDev source (which rendered Bengali-digit
 * amounts, e.g. `৳১,৪৯৯`): financial values now use clean Latin numerals
 * (`৳1,499`) so they render legibly and align on a tabular grid in the
 * project's sans-serif numeric styling (see `numericTextClass` in
 * `MasterclassSection.tsx`) — a request from live production testing.
 * Bengali digits remain everywhere else (dates, counts in body copy) via
 * `toBengaliDigits()` below; this function is the one deliberate exception.
 * Always pass a value from `resolvePriceBDT()` or an already-stored order
 * amount, never a re-typed literal.
 */
export function formatBDT(amountBDT: number): string {
  const grouped = amountBDT.toLocaleString("en-US");
  return `৳${grouped}`;
}

const BENGALI_MONTHS = [
  "জানুয়ারি",
  "ফেব্রুয়ারি",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টেম্বর",
  "অক্টোবর",
  "নভেম্বর",
  "ডিসেম্বর",
];

/**
 * Always resolved in `Asia/Dhaka` — the class's own timezone — never the
 * server's local time, so `day`/`month`/`year` are correct regardless of
 * where this code runs (a Vercel function is typically UTC).
 */
function dhakaDateParts(date: Date): { day: number; month: number; year: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(date);
  const get = (type: string): number => Number(parts.find((part) => part.type === type)?.value);
  return { day: get("day"), month: get("month"), year: get("year") };
}

/**
 * The single place either `classDates` value (`constants.ts`) becomes a
 * displayed Bengali date-range string, e.g. `"২৩–২৪ অক্টোবর ২০২৬"` — never
 * re-typed as a literal in `masterclass-content.ts`/`legal-content.ts`, so
 * changing a batch's dates only ever means editing `classDates`. Assumes
 * both days fall in the same calendar month/year (true for every batch so
 * far); a batch spanning two months would need a real range formatter, not
 * just two day-numbers joined by an en dash.
 */
export function formatClassDatesBn(day1: Date, day2: Date): string {
  const d1 = dhakaDateParts(day1);
  const d2 = dhakaDateParts(day2);
  const month = BENGALI_MONTHS[d1.month - 1];
  return `${toBengaliDigits(String(d1.day))}–${toBengaliDigits(String(d2.day))} ${month} ${toBengaliDigits(String(d1.year))}`;
}

/** Same derivation as `formatClassDatesBn()`, but for the English-only OG-image card (see that file's doc comment for why it can't render Bengali). */
export function formatClassDatesEn(day1: Date, day2: Date): string {
  const d1 = dhakaDateParts(day1);
  const d2 = dhakaDateParts(day2);
  const month = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "Asia/Dhaka" }).format(day1);
  return `${month} ${d1.day}–${d2.day}, ${d1.year}`;
}
