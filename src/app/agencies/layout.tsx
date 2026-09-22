import type { ReactNode } from "react";

import { AgenciesFooter } from "@/components/agencies/agencies-footer";
import { AgenciesHeader } from "@/components/agencies/agencies-header";
import { TrackingGate } from "@/components/public/tracking-gate";

/**
 * A separate top-level tree from `(public)` — same reasoning as
 * `src/app/masterclass`: this is a single-conversion-path landing page for
 * paid traffic, so it gets its own minimal header/footer (no site nav, no
 * masterclass banner) rather than inheriting `SiteHeader`/`SiteFooter`/
 * `MasterclassAnnouncementBanner` from `(public)/layout.tsx`. `TrackingGate`
 * has to be rendered here explicitly for the same reason — it's only
 * rendered from `(public)/layout.tsx`, which this tree doesn't share.
 */
export default function AgenciesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TrackingGate />
      <AgenciesHeader />
      <main className="flex-1">{children}</main>
      <AgenciesFooter />
    </>
  );
}
