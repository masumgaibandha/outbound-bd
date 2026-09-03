import { Container } from "@/components/public/container";
import { header } from "@/data/masterclass-content";

/**
 * Deliberately not the agency `SiteHeader` — no site nav, no services/pricing
 * links, so this sales page stays focused on one conversion path. Ported
 * from the MasumDev masterclass source.
 */
export function MasterclassHeader() {
  return (
    <header className="border-hairline bg-canvas sticky top-0 z-30 border-b">
      <Container className="flex h-16 items-center justify-between gap-4 md:h-20">
        <span className="font-heading text-ink inline-flex items-baseline text-lg font-bold tracking-[-0.02em] md:text-xl">
          {header.wordmark}
        </span>

        <a
          href="#registration"
          className="border-hairline text-ink hover:border-action hover:text-action focus-visible:outline-action rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 md:px-5 md:py-2.5"
        >
          {header.ctaLabel}
        </a>
      </Container>
    </header>
  );
}
