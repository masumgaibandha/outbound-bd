import type { Metadata } from "next";

import { ButtonLink } from "@/components/public/button";
import { Container } from "@/components/public/container";
import { MasterclassAnnouncementBanner } from "@/components/public/masterclass-announcement-banner";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { masterclassSlug } from "@/lib/masterclass/constants";
import { isRegistrationEnabled } from "@/lib/masterclass/env";

/*
 * Verified against a real build with NO not-found.tsx at all (Next's own
 * built-in fallback UI): the root layout's site-wide `robots: {index:
 * true, follow: true}` (src/app/layout.tsx) still renders as its own
 * `<meta name="robots" content="index, follow">`, and Next additionally,
 * unconditionally injects its own `<meta name="robots" content="noindex">`
 * for any genuine 404 response — this second tag cannot be suppressed or
 * merged away by page-level metadata; it's baked into how Next renders a
 * true not-found response, with or without a custom not-found.tsx.
 *
 * Given that, the one thing this file's own metadata CAN control is
 * whether the *other* tag (the one actually driven by ordinary Next.js
 * metadata resolution) says the right thing. Explicitly setting `robots`
 * here overrides the root layout's wrong `index, follow` default for this
 * route, so both tags that render are at least directionally consistent
 * (both restrictive), instead of one contradicting the other. Getting the
 * literal tag count down to one would require changing the root layout's
 * site-wide default — out of scope for this isolated page.
 */
export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

/*
 * A root-level not-found.tsx is wrapped only by the root layout
 * (src/app/layout.tsx) — never by src/app/(public)/layout.tsx, since route
 * groups only apply to routes that actually resolve inside them, and an
 * unmatched path resolves nowhere. The root layout carries no header/footer
 * (see its own file), so this reuses SiteHeader/SiteFooter directly rather
 * than duplicating their markup, mirroring PublicLayout's exact structure
 * (including the same registration-gated announcement banner) so a 404
 * still looks and behaves like the rest of the site's chrome.
 */
export default function NotFound() {
  const showMasterclassBanner = isRegistrationEnabled();

  return (
    <>
      {showMasterclassBanner ? <MasterclassAnnouncementBanner /> : null}
      <SiteHeader />
      <main className="flex-1">
        <Container className="flex flex-col items-center py-24 text-center md:py-32">
          <p className="text-ink-muted text-xs font-semibold tracking-[0.18em] uppercase">
            404 · Page not found
          </p>
          <h1 className="type-display font-bengali text-ink mt-5 text-balance">
            পৃষ্ঠা খুঁজে পাওয়া যায়নি
          </h1>
          <p className="text-ink-muted font-bengali mt-6 max-w-prose text-base leading-relaxed text-pretty md:text-lg">
            আপনি যে পৃষ্ঠাটি খুঁজছেন সেটি হয়তো সরানো হয়েছে, পরিবর্তন করা হয়েছে, অথবা ঠিকানাটি সঠিক নয়।
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/" tone="action" size="lg">
              হোমপেজে ফিরুন
            </ButtonLink>
            <ButtonLink href={`/masterclass/${masterclassSlug}`} tone="outline" size="lg">
              মাস্টারক্লাস দেখুন
            </ButtonLink>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
