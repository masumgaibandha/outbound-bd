import type { ReactNode } from "react";

import { AgenciesFooter } from "@/components/agencies/agencies-footer";
import { AgenciesHeader } from "@/components/agencies/agencies-header";
import { TrackingGate } from "@/components/public/tracking-gate";

/**
 * Same shell as `src/app/agencies/layout.tsx`, for the same reasons: a
 * single-conversion-path landing page for paid traffic (logo-only header,
 * legal-only footer, no site nav, no masterclass banner), which has to
 * render `TrackingGate` itself because it doesn't share `(public)/layout.tsx`.
 */
export default function ColdEmailLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TrackingGate />
      <AgenciesHeader />
      <main className="flex-1">{children}</main>
      <AgenciesFooter />
    </>
  );
}
