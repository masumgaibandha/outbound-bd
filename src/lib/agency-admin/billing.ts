import { utcInstantToDhakaDateOnly } from "@/lib/agency-admin/timezone";

/**
 * The next date (Asia/Dhaka calendar date, `YYYY-MM-DD`) on or after `now`
 * that matches `billingDayOfMonth` — this month's if `now`'s Dhaka day
 * hasn't passed it yet, otherwise next month's. `billingDayOfMonth` is
 * always 1-28 (validated at input — see `clients-validation.ts`), so it's
 * a real calendar day in every month, including February; no "day doesn't
 * exist in this month" case to handle.
 */
export function nextBillingDateInDhaka(billingDayOfMonth: number, now: Date = new Date()): string {
  const [year, month, day] = utcInstantToDhakaDateOnly(now).split("-").map(Number);

  let targetYear = year;
  let targetMonth = month;
  if (day > billingDayOfMonth) {
    targetMonth += 1;
    if (targetMonth > 12) {
      targetMonth = 1;
      targetYear += 1;
    }
  }

  const mm = String(targetMonth).padStart(2, "0");
  const dd = String(billingDayOfMonth).padStart(2, "0");
  return `${targetYear}-${mm}-${dd}`;
}
