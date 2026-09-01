import type { Metadata } from "next";

import { Container } from "@/components/public/container";
import { CONTACT_EMAIL } from "@/components/public/site-config";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that apply to using outboundbd.com and engaging Outbound BD's services.",
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "August 31, 2026";

export default function TermsOfServicePage() {
  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <Container className="max-w-3xl">
        <p className="text-ink-muted text-xs font-semibold tracking-[0.18em] uppercase">
          Legal
        </p>
        <h1 className="font-heading text-ink type-section mt-4">
          Terms of Service
        </h1>
        <p className="text-ink-muted mt-3 text-sm">Last updated: {LAST_UPDATED}</p>

        <div className="text-ink-muted mt-10 flex flex-col gap-8 text-sm leading-relaxed">
          <p>
            These terms cover your use of outboundbd.com and, in general
            terms, how an engagement with Outbound BD works. They&apos;re
            written in plain English to accurately describe how the site and
            business currently operate — they are not a substitute for
            independent legal review before you sign an actual services
            agreement.
          </p>

          <div>
            <h2 className="text-ink text-base font-semibold">
              What this site is
            </h2>
            <p className="mt-2">
              Outbound BD provides cold email outreach and B2B lead
              generation services, including email infrastructure,
              deliverability, campaign management, and prospect list
              building. This website is informational and consultation-led —
              it does not sell or process payment for services directly.
              Submitting a form or booking a call does not create a contract
              or purchase.
            </p>
          </div>

          <div>
            <h2 className="text-ink text-base font-semibold">
              How an engagement actually works
            </h2>
            <p className="mt-2">
              Visiting this site and requesting a proposal or discovery call
              starts a qualification conversation, not a transaction. If
              we&apos;re a good fit, we send a written proposal, and any
              paid engagement is confirmed through a separate signed
              agreement and invoice handled outside this website. Nothing on
              this site is a binding offer until that agreement is signed by
              both parties.
            </p>
          </div>

          <div>
            <h2 className="text-ink text-base font-semibold">
              Pricing guidance
            </h2>
            <p className="mt-2">
              Prices shown on this site are transparent starting points for
              planning purposes, not final quotes. Actual scope, timeline,
              and pricing for any engagement are confirmed in writing before
              work begins.
            </p>
          </div>

          <div>
            <h2 className="text-ink text-base font-semibold">No guaranteed results</h2>
            <p className="mt-2">
              We run every program to a high standard, but reply rates,
              meeting volume, and pipeline outcomes depend on your market,
              offer, and target audience. We do not guarantee specific
              results, and nothing on this site should be read as a
              guarantee.
            </p>
          </div>

          <div>
            <h2 className="text-ink text-base font-semibold">
              Content and intellectual property
            </h2>
            <p className="mt-2">
              The content, design, and branding of this site belong to
              Outbound BD. Testimonials and case studies published here are
              real and used with the understanding described on our{" "}
              <a href="/results" className="text-ink decoration-action hover:text-action font-medium underline decoration-2 underline-offset-4 transition-colors">
                Results
              </a>{" "}
              page — we do not publish invented figures, names, or
              partnerships.
            </p>
          </div>

          <div>
            <h2 className="text-ink text-base font-semibold">
              Limitation of liability
            </h2>
            <p className="mt-2">
              This website and its content are provided as-is. To the extent
              permitted by law, Outbound BD is not liable for indirect or
              consequential loss arising from your use of this site. This
              does not affect any liability that a separately signed
              services agreement establishes for actual paid work.
            </p>
          </div>

          <div>
            <h2 className="text-ink text-base font-semibold">Changes</h2>
            <p className="mt-2">
              We may update these terms as the business evolves. Material
              changes will update the date above.
            </p>
          </div>

          <div>
            <h2 className="text-ink text-base font-semibold">Contact</h2>
            <p className="mt-2">
              Questions about these terms — write to{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-ink decoration-action hover:text-action font-medium underline decoration-2 underline-offset-4 transition-colors"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
