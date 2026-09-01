import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/public/container";
import { ContactForm } from "@/components/public/contact-form";
import {
  CONTACT_EMAIL,
  STRATEGY_CALL_HREF,
  STRATEGY_CALL_LABEL,
  STRATEGY_CALL_LINK_PROPS,
} from "@/components/public/site-config";
import { resolveContactPrefill } from "@/lib/contact-prefill";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Tell us about your project and goals. No account required — a real person reads every inquiry and follows up by email.",
};

type ContactPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const params = await searchParams;
  const rawPlan = firstValue(params.plan);
  const rawService = firstValue(params.service);

  const { initialService, initialGoals, selectedPlanName } =
    resolveContactPrefill({ plan: rawPlan, service: rawService });

  return (
    <section className="hero-wash relative py-16 sm:py-20 lg:py-24">
      <Container>
        <div className="max-w-2xl">
          <p className="text-ink-muted text-xs font-semibold tracking-[0.18em] uppercase">
            Contact
          </p>
          <h1 className="font-heading text-ink type-section mt-4 text-balance">
            Tell us about your project
          </h1>
          <p className="text-ink-muted mt-5 text-lg leading-relaxed text-pretty">
            Share a few details about your goals and we&apos;ll follow up by
            email. No account or commitment required to get started.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-14 lg:grid-cols-[1.6fr_1fr]">
          <div>
            {selectedPlanName ? (
              <p className="border-hairline bg-accent text-accent-ink mb-6 border px-4 py-3 text-sm">
                Selected: <span className="font-semibold">{selectedPlanName}</span>
              </p>
            ) : null}
            <ContactForm
              initialService={initialService}
              initialGoals={initialGoals}
            />
          </div>

          <aside className="flex flex-col gap-8">
            <div>
              <h2 className="text-ink text-xs font-semibold tracking-[0.16em] uppercase">
                Prefer to talk first?
              </h2>
              <p className="text-ink-muted mt-3 text-sm leading-relaxed">
                Book a 30-minute discovery call instead — same qualification
                conversation, just live.
              </p>
              <a
                href={STRATEGY_CALL_HREF}
                className="text-action hover:text-action-hover focus-visible:outline-action mt-3 inline-block rounded-sm text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
                {...STRATEGY_CALL_LINK_PROPS}
              >
                {STRATEGY_CALL_LABEL} →
              </a>
            </div>

            <div className="border-hairline border-t pt-8">
              <h2 className="text-ink text-xs font-semibold tracking-[0.16em] uppercase">
                What happens next
              </h2>
              <p className="text-ink-muted mt-3 text-sm leading-relaxed">
                Every inquiry is read personally — not routed through a
                ticketing queue. We&apos;ll reply by email to ask any
                follow-up questions and figure out whether we&apos;re a good
                fit, then send a proposal and agreement outside the website.
              </p>
            </div>

            <div className="border-hairline border-t pt-8">
              <h2 className="text-ink text-xs font-semibold tracking-[0.16em] uppercase">
                Prefer email?
              </h2>
              <p className="text-ink-muted mt-3 text-sm leading-relaxed">
                Reach us directly at{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-ink decoration-action hover:text-action font-medium underline decoration-2 underline-offset-4 transition-colors"
                >
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </div>

            <div className="border-hairline border-t pt-8">
              <h2 className="text-ink text-xs font-semibold tracking-[0.16em] uppercase">
                Not sure what you need?
              </h2>
              <p className="text-ink-muted mt-3 text-sm leading-relaxed">
                Browse what we do before reaching out.
              </p>
              <Link
                href="/services"
                className="text-action hover:text-action-hover focus-visible:outline-action mt-3 inline-block rounded-sm text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
              >
                See all services →
              </Link>
            </div>
          </aside>
        </div>
      </Container>
    </section>
  );
}
