import type { Metadata } from "next";

import { CalendlyInlineEmbed } from "@/components/agencies/calendly-inline-embed";
import { Container } from "@/components/public/container";

// noindex, and deliberately absent from src/app/sitemap.ts — this page only
// ever makes sense as the direct result of a form submission, never as a
// standalone discoverable URL.
export const metadata: Metadata = {
  title: "Thanks",
  robots: { index: false, follow: false },
};

export default function AgenciesThankYouPage() {
  return (
    <section className="pt-4 pb-8 sm:pt-6 lg:pt-8">
      <Container>
        {/*
          Deliberately not <SectionHeading> here — that component's
          type-section scale (28-40px) plus its own spacing is sized for a
          full marketing section, not a compact header that has to leave
          most of a 1366x768 viewport free for the embed below it. Grid
          (not flex) so the DOM order — text, then embed — is what mobile
          gets by default with zero extra markup, while lg+ turns the same
          two children into narrow-text-left / embed-right via the column
          template alone.
        */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[320px_1fr] lg:items-center lg:gap-10">
          <div>
            <p className="text-ink-muted flex items-center gap-3 text-xs font-semibold tracking-[0.18em] uppercase">
              <span aria-hidden="true" className="bg-action h-px w-8 shrink-0" />
              Thanks
            </p>
            <h1 className="font-heading text-ink mt-2 text-xl tracking-tight text-balance sm:text-2xl">
              Got your details. Let&apos;s find time to talk.
            </h1>
            <p className="text-ink-muted mt-2 text-sm leading-relaxed text-pretty">
              Pick a time below and I&apos;ll walk through your clients&apos;
              offer and whether cold email is the right fit.
            </p>
          </div>

          <CalendlyInlineEmbed utmContent="agencies-cold-email" />
        </div>
      </Container>
    </section>
  );
}
