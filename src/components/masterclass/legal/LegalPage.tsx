import Link from "next/link";

import { Container } from "@/components/public/container";
import { CONTACT_EMAIL } from "@/components/public/site-config";
import { MasterclassFooter } from "@/components/masterclass/MasterclassFooter";
import { MasterclassHeader } from "@/components/masterclass/MasterclassHeader";
import { legalMeta, legalPageLinks } from "@/data/legal-content";
import type { LegalPageContent } from "@/types/legal";

interface LegalPageProps {
  content: LegalPageContent;
}

/**
 * Shared chrome for all three masterclass legal pages — header, hero, body
 * sections, cross-links to the other two policies, contact link, footer.
 * Ported from the MasumDev masterclass source's `LegalPage.tsx`, but reuses
 * this repo's `MasterclassHeader`/`MasterclassFooter` instead of duplicating
 * separate `LegalHeader`/`LegalFooter` components — those two source
 * components were otherwise identical to the masterclass header/footer.
 */
export function LegalPage({ content }: LegalPageProps) {
  const otherPages = legalPageLinks.filter((link) => link.slug !== content.slug);

  return (
    <>
      <a
        href="#main"
        className="focus:bg-ink focus:text-on-dark sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-100 focus:rounded-full focus:px-5 focus:py-3 focus:text-sm focus:font-medium"
      >
        মূল কনটেন্টে যান
      </a>

      <MasterclassHeader />

      <main id="main">
        <header className="relative">
          <div aria-hidden="true" className="hero-wash pointer-events-none absolute inset-0 -z-10" />
          <Container className="pt-14 pb-10 md:pt-16 md:pb-12">
            <p className="text-ink-muted flex items-center gap-3 text-xs font-semibold tracking-[0.14em] uppercase">
              <span aria-hidden="true" className="bg-action h-px w-8 shrink-0" />
              {content.eyebrow}
            </p>
            <h1 className="type-section font-bengali text-ink mt-4 max-w-3xl text-balance">
              {content.heading}
            </h1>
            <p className="text-ink-muted font-bengali mt-4 text-sm font-medium">
              {legalMeta.lastUpdatedLabel}
            </p>
            <div className="mt-6 space-y-3">
              {content.intro.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 24)}
                  className="text-ink-muted font-bengali max-w-prose leading-relaxed md:text-lg"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </Container>
        </header>

        <Container className="pb-16 md:pb-20">
          <div className="max-w-prose space-y-10">
            {content.sections.map((section) => (
              <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`}>
                <h2
                  id={`${section.id}-heading`}
                  className="font-heading text-ink text-xl tracking-tight md:text-2xl"
                >
                  {section.heading}
                </h2>
                <div className="mt-3 space-y-3">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph.slice(0, 24)} className="text-ink-muted font-bengali leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
                {section.items ? (
                  <ul className="mt-3 space-y-2">
                    {section.items.map((item) => (
                      <li key={item} className="text-ink-muted font-bengali flex items-start gap-2.5 leading-relaxed">
                        <span aria-hidden="true" className="bg-action mt-2.5 size-1 shrink-0 rounded-full" />
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>

          <div className="border-hairline bg-surface font-bengali mt-12 max-w-prose border p-6 text-sm leading-relaxed md:p-8">
            <p className="text-ink-muted">{legalMeta.disclaimer}</p>
            <p className="text-ink-muted mt-3">
              প্রশ্ন থাকলে যোগাযোগ করুন:{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-ink decoration-action hover:text-action rounded-sm font-medium underline decoration-2 underline-offset-4 transition-colors"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>

          <nav aria-label="অন্যান্য নীতিমালা" className="border-hairline mt-10 max-w-prose border-t pt-8">
            <p className="text-ink-muted font-bengali text-xs font-semibold tracking-[0.14em] uppercase">
              সম্পর্কিত নীতিমালা
            </p>
            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
              {otherPages.map((link) => (
                <li key={link.slug}>
                  <Link
                    href={link.href}
                    className="text-ink decoration-action hover:text-action rounded-sm text-sm font-medium underline decoration-2 underline-offset-4 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </Container>
      </main>

      <MasterclassFooter />
    </>
  );
}
