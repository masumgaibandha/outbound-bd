/**
 * Single source of truth for every founder/credibility statistic shown
 * anywhere on the site (homepage credibility strip, founder page). Update
 * the numbers here once and every surface stays consistent — never restate
 * a figure inline in a component.
 *
 * VERIFIED 2026-09-01 against the founder's public Upwork profile
 * (https://www.upwork.com/freelancers/~01a5eccfaf40a8a065?viewMode=1):
 * Top Rated badge, 245 total jobs, 22,000+ total hours. "245 Total jobs" is
 * Upwork's own field label — kept as "Upwork jobs" here, not reworded to
 * "completed projects".
 *
 * Deliberately NOT shown:
 * - Earnings: Upwork does not publicly expose a total-earnings figure on
 *   the profile, so one can't be verified. Do not add a number, and do not
 *   show placeholder/"awaiting confirmation" text to visitors — just omit
 *   the stat entirely until the founder supplies a real, confirmed figure.
 * - Job Success Score (91%): visible on the profile but intentionally
 *   excluded per instruction — add it back only if explicitly requested.
 */
export const founderStats = [
  { value: "10+", label: "Years of outreach experience" },
  { value: "245", label: "Upwork jobs" },
  { value: "22,000+", label: "Upwork hours" },
] as const;

export const founderStatsQualifier =
  "Figures are from the founder's individual Upwork track record, verified against the live profile.";
