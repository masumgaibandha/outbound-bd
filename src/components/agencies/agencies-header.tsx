import { Container } from "@/components/public/container";
import { Logo } from "@/components/public/logo";

/**
 * Logo only, no site navigation — deliberately not the agency `SiteHeader`,
 * same "single conversion path" principle `MasterclassHeader.tsx` already
 * uses for the masterclass sales page (see that file's own doc comment).
 * The logo isn't a link: this page has exactly one job for a paid-traffic
 * visitor, and a stray way back to the main site works against that.
 */
export function AgenciesHeader() {
  return (
    <header className="border-hairline bg-canvas sticky top-0 z-30 border-b">
      <Container className="flex h-16 items-center md:h-20">
        <Logo surface="canvas" className="h-8 w-auto sm:h-9 lg:h-10" priority />
      </Container>
    </header>
  );
}
