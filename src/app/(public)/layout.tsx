import type { ReactNode } from "react";

import { MasterclassAnnouncementBanner } from "@/components/public/masterclass-announcement-banner";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { isRegistrationEnabled } from "@/lib/masterclass/env";

export default function PublicLayout({ children }: { children: ReactNode }) {
  // Resolved server-side, once, per request — the client banner component
  // never reads MASTERCLASS_REGISTRATION_ENABLED (or any env var) itself,
  // and isn't even mounted when this is false, so there's no client-side
  // toggle that could flash the banner after hydration.
  const showMasterclassBanner = isRegistrationEnabled();

  return (
    <>
      {showMasterclassBanner ? <MasterclassAnnouncementBanner /> : null}
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
