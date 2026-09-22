import Link from "next/link";

import { Container } from "@/components/public/container";
import { FOOTER_LEGAL_LINKS } from "@/components/public/site-config";

const linkClass =
  "text-on-dark-muted hover:text-on-dark focus-visible:outline-action-dark rounded-sm text-sm font-medium underline decoration-2 underline-offset-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4";

/**
 * Deliberately not the agency `SiteFooter` — no service columns, no social
 * links, no site nav, same "single conversion path" reasoning as
 * `AgenciesHeader`. Only what's legally necessary.
 */
export function AgenciesFooter() {
  return (
    <footer className="bg-ink text-on-dark">
      <Container className="flex flex-col items-start gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-on-dark-muted text-xs">
          &copy; {new Date().getFullYear()} Outbound BD. All rights reserved.
        </p>
        <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2">
          {FOOTER_LEGAL_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass}>
              {link.label}
            </Link>
          ))}
        </nav>
      </Container>
    </footer>
  );
}
