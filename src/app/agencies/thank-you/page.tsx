import type { Metadata } from "next";

import { CalendlyInlineEmbed } from "@/components/agencies/calendly-inline-embed";
import { Container } from "@/components/public/container";
import { SectionHeading } from "@/components/public/section-heading";

// noindex, and deliberately absent from src/app/sitemap.ts — this page only
// ever makes sense as the direct result of a form submission, never as a
// standalone discoverable URL.
export const metadata: Metadata = {
  title: "Thanks",
  robots: { index: false, follow: false },
};

export default function AgenciesThankYouPage() {
  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <Container className="max-w-3xl">
        <SectionHeading
          eyebrow="Thanks"
          title="Got your details. Let's find time to talk."
          description="Pick a time below and I'll walk through your clients' offer and whether cold email is the right fit."
        />

        <div className="mt-12">
          <CalendlyInlineEmbed />
        </div>
      </Container>
    </section>
  );
}
