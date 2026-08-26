import type { Metadata } from "next";
import Link from "next/link";

import { ContactForm } from "@/components/public/contact-form";
import { CONTACT_EMAIL } from "@/components/public/site-config";
import { SERVICE_INTEREST_OPTIONS } from "@/lib/inquiry-schema";
import { getCatalogEntryById, getCatalogPrefillNote } from "@/lib/pricing-catalog";

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

  // A valid `plan` is authoritative for both the service and the prefill
  // note, so a mismatched `service` param can't contradict it.
  const planEntry = rawPlan ? getCatalogEntryById(rawPlan) : undefined;
  const isServiceValid = SERVICE_INTEREST_OPTIONS.some(
    (option) => option.value === rawService,
  );

  const initialService = planEntry
    ? planEntry.relatedServiceSlug
    : isServiceValid
      ? rawService
      : undefined;
  const initialGoals = planEntry ? getCatalogPrefillNote(planEntry) : undefined;
  const selectedPlanName = planEntry?.name;

  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.14em] text-royal uppercase">
            Contact
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance text-ink sm:text-4xl lg:text-5xl">
            Tell us about your project
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-pretty text-subtext">
            Share a few details about your goals and we&apos;ll follow up by
            email. No account or commitment required to get started.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-xl border border-hairline p-6 sm:p-8">
            {selectedPlanName ? (
              <p className="mb-6 rounded-lg border border-hairline bg-canvas px-4 py-3 text-sm text-ink">
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
              <h2 className="text-sm font-semibold tracking-[0.08em] text-ink uppercase">
                What happens next
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-subtext">
                Every inquiry is read personally — not routed through a
                ticketing queue. We&apos;ll reply by email to ask any
                follow-up questions and figure out whether we&apos;re a good
                fit before anything else happens.
              </p>
            </div>

            <div className="border-t border-hairline pt-8">
              <h2 className="text-sm font-semibold tracking-[0.08em] text-ink uppercase">
                Prefer email?
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-subtext">
                Reach us directly at{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="font-medium text-royal transition-colors hover:text-navy"
                >
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </div>

            <div className="border-t border-hairline pt-8">
              <h2 className="text-sm font-semibold tracking-[0.08em] text-ink uppercase">
                Not sure what you need?
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-subtext">
                Browse what we do before reaching out.
              </p>
              <Link
                href="/services"
                className="mt-3 inline-block text-sm font-medium text-royal transition-colors hover:text-navy"
              >
                See all services &rarr;
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
