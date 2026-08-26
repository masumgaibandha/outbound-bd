import Link from "next/link";

import { Logo } from "@/components/public/logo";
import {
  CONTACT_EMAIL,
  FOOTER_EXPLORE_LINKS,
} from "@/components/public/site-config";
import { SERVICES } from "@/components/public/services-data";

const CURRENT_YEAR = new Date().getFullYear();

const SERVICE_LINKS = SERVICES.map((service) => ({
  href: `/services/${service.slug}`,
  label: service.navLabel,
}));

export function SiteFooter() {
  return (
    <footer className="bg-navy">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo surface="navy" className="h-6 w-auto" />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-azure/90">
              B2B cold email and lead generation for revenue teams who need
              predictable, qualified conversations.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold tracking-[0.1em] text-azure uppercase">
              Explore
            </h3>
            <ul className="mt-4 space-y-3">
              {FOOTER_EXPLORE_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-canvas/85 transition-colors hover:text-canvas"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold tracking-[0.1em] text-azure uppercase">
              Services
            </h3>
            <ul className="mt-4 space-y-3">
              {SERVICE_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-canvas/85 transition-colors hover:text-canvas"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold tracking-[0.1em] text-azure uppercase">
              Get started
            </h3>
            <ul className="mt-4 space-y-3">
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-sm text-canvas/85 transition-colors hover:text-canvas"
                >
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li>
                <Link
                  href="/sign-in"
                  className="text-sm text-canvas/85 transition-colors hover:text-canvas"
                >
                  Client Login
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-azure/80">
            &copy; {CURRENT_YEAR} Outbound BD. All rights reserved.
          </p>
          <p className="text-sm text-azure/80">
            Senior strategists. Dedicated infrastructure. Global coverage.
          </p>
        </div>
      </div>
    </footer>
  );
}
