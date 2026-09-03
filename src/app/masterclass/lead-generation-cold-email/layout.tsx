import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Hind_Siliguri } from "next/font/google";

import { masterclassMeta } from "@/data/masterclass-content";
import { isRegistrationEnabled } from "@/lib/masterclass/env";

/*
 * Route-scoped Bengali font. Next.js only lets the root layout render
 * <html>/<body> (src/app/layout.tsx already does, with the site's own
 * Playfair Display/Poppins stack), so this can't replace the root font
 * stack — it's applied to a wrapper div below instead, via the
 * `--font-hind-siliguri` variable and the `font-bengali` utility (see
 * globals.css). Every other route on the site keeps Playfair/Poppins
 * untouched. Ported from the MasumDev masterclass source.
 */
const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hind-siliguri",
  display: "swap",
});

const canonicalPath = "/masterclass/lead-generation-cold-email";

export const metadata: Metadata = {
  title: { absolute: masterclassMeta.seoTitle },
  description: masterclassMeta.metaDescription,
  alternates: { canonical: canonicalPath },
  /*
   * Tied to the same `MASTERCLASS_REGISTRATION_ENABLED` flag that gates
   * sitemap inclusion (src/app/sitemap.ts) — so long as registration stays
   * closed, this page is deliberately unindexed and not linked from any
   * existing agency page or nav. Flipping that one env var at go-live opens
   * both indexing and the sitemap entry together, with no separate manual
   * code change to remember.
   */
  robots: isRegistrationEnabled()
    ? { index: true, follow: true }
    : { index: false, follow: false },
  openGraph: {
    type: "website",
    url: canonicalPath,
    title: masterclassMeta.seoTitle,
    description: masterclassMeta.metaDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: masterclassMeta.seoTitle,
    description: masterclassMeta.metaDescription,
  },
};

export default function MasterclassLayout({ children }: { children: ReactNode }) {
  return (
    <div lang="bn" className={`${hindSiliguri.variable} font-bengali`}>
      {children}
    </div>
  );
}
