import Link from "next/link";

import { Container } from "@/components/public/container";
import { legalPageLinks } from "@/data/legal-content";
import { footer, header } from "@/data/masterclass-content";

const linkClass =
  "text-on-dark hover:text-action-dark focus-visible:outline-action-dark font-bengali rounded-sm text-sm font-medium underline decoration-2 underline-offset-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4";

/**
 * Deliberately not the agency `SiteFooter` — no service columns, no social
 * links. Ported from the MasumDev masterclass source.
 */
export function MasterclassFooter() {
  return (
    <footer className="bg-ink text-on-dark">
      <Container className="flex flex-col gap-6 py-8 md:flex-row md:items-start md:justify-between md:py-10">
        <div>
          <span className="font-heading text-lg font-bold tracking-[-0.02em]">
            {header.wordmark}
          </span>
          <p className="text-on-dark-muted font-bengali mt-1.5 max-w-md text-sm leading-relaxed">
            {footer.positioning}
          </p>
        </div>

        <div className="flex flex-col items-start gap-4 md:items-end">
          <Link href="/" className={linkClass}>
            {footer.backToPortfolio}
          </Link>

          <nav aria-label="নীতিমালা" className="flex flex-wrap gap-x-5 gap-y-2">
            {legalPageLinks.map((link) => (
              <Link key={link.slug} href={link.href} className={linkClass}>
                {link.label}
              </Link>
            ))}
          </nav>

          <p className="text-on-dark-muted font-bengali text-xs">
            {footer.copyright}
          </p>
        </div>
      </Container>
    </footer>
  );
}
