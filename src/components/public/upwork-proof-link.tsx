import { ArrowUpRightIcon } from "@/components/public/icons";
import {
  EXTERNAL_LINK_PROPS,
  UPWORK_PROFILE_URL,
} from "@/components/public/site-config";

/**
 * Links out to the founder's own public Upwork profile so the stats next
 * to it (Top Rated, jobs, hours) are independently checkable — not an
 * Upwork partnership or endorsement, just a citation. Never pair this with
 * earnings or Job Success Score; see founder-stats.ts for why those are
 * excluded.
 */
export function UpworkProofLink({ className = "" }: { className?: string }) {
  return (
    <a
      href={UPWORK_PROFILE_URL}
      {...EXTERNAL_LINK_PROPS}
      className={`text-ink-muted hover:text-action focus-visible:outline-action inline-flex items-center gap-1.5 rounded-sm text-sm font-medium underline decoration-2 underline-offset-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 ${className}`}
    >
      View verified Upwork profile
      <ArrowUpRightIcon
        width={14}
        height={14}
        aria-hidden="true"
        className="shrink-0"
      />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
