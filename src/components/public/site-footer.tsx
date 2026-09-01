import Link from "next/link";

import { Container } from "@/components/public/container";
import { MailIcon } from "@/components/public/icons";
import { Logo } from "@/components/public/logo";
import {
  CONTACT_EMAIL,
  FOOTER_EXPLORE_LINKS,
  FOOTER_LEGAL_LINKS,
  STRATEGY_CALL_HREF,
  STRATEGY_CALL_LABEL,
  STRATEGY_CALL_LINK_PROPS,
} from "@/components/public/site-config";
import { SERVICES } from "@/components/public/services-data";

const CURRENT_YEAR = new Date().getFullYear();

const SERVICE_LINKS = SERVICES.map((service) => ({
  href: `/services/${service.slug}`,
  label: service.navLabel,
}));

const linkClass =
  "text-on-dark/75 hover:text-action-dark focus-visible:outline-action-dark rounded-sm text-sm transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-4";

const headingClass =
  "text-on-dark-muted text-xs font-semibold tracking-[0.16em] uppercase";

export function SiteFooter() {
  return (
    <footer className="bg-ink text-on-dark">
      <Container className="py-14 md:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <Logo surface="dark" className="h-6 w-auto" />
            <p className="text-on-dark-muted mt-5 max-w-xs text-sm leading-relaxed">
              B2B cold email and lead generation for revenue teams who need
              predictable, qualified conversations.
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-on-dark hover:text-action-dark decoration-action-dark focus-visible:outline-action-dark mt-4 inline-flex items-center gap-2 rounded-sm text-sm font-medium underline decoration-2 underline-offset-4 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              <MailIcon width={16} height={16} aria-hidden="true" />
              {CONTACT_EMAIL}
            </a>
          </div>

          <nav aria-label="Footer">
            <h3 className={headingClass}>Explore</h3>
            <ul className="mt-4 space-y-3">
              {FOOTER_EXPLORE_LINKS.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Services">
            <h3 className={headingClass}>Services</h3>
            <ul className="mt-4 space-y-3">
              {SERVICE_LINKS.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h3 className={headingClass}>Get started</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href={STRATEGY_CALL_HREF} className={linkClass} {...STRATEGY_CALL_LINK_PROPS}>
                  {STRATEGY_CALL_LABEL}
                </Link>
              </li>
              <li>
                <Link href="/contact" className={linkClass}>
                  Request a Proposal
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </Container>

      {/* Full-bleed bottom bar reads as the page's final rule. */}
      <div className="border-on-dark/15 border-t">
        <Container className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-on-dark-muted text-xs">
            &copy; {CURRENT_YEAR} Outbound BD. All rights reserved.
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
            {FOOTER_LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-on-dark-muted hover:text-action-dark focus-visible:outline-action-dark rounded-sm text-xs transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-4"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </div>
    </footer>
  );
}
