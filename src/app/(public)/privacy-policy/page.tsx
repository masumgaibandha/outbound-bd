import type { Metadata } from "next";

import { Container } from "@/components/public/container";
import { CONTACT_EMAIL } from "@/components/public/site-config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Outbound BD collects, uses, and protects information submitted through this website.",
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "August 31, 2026";

export default function PrivacyPolicyPage() {
  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <Container className="max-w-3xl">
        <p className="text-ink-muted text-xs font-semibold tracking-[0.18em] uppercase">
          Legal
        </p>
        <h1 className="font-heading text-ink type-section mt-4">
          Privacy Policy
        </h1>
        <p className="text-ink-muted mt-3 text-sm">Last updated: {LAST_UPDATED}</p>

        <div className="text-ink-muted mt-10 flex flex-col gap-8 text-sm leading-relaxed">
          <p>
            This policy describes what happens to information you submit
            through outboundbd.com. Outbound BD is a consultation-led
            agency — this website does not have user accounts, does not
            process payments, and does not require you to create a login to
            use it.
          </p>

          <div>
            <h2 className="text-ink text-base font-semibold">
              What we collect
            </h2>
            <p className="mt-2">
              The only personal information this site collects is what you
              choose to submit through the contact / &ldquo;Request a
              Proposal&rdquo; form: your name, email address, company name,
              company website, the service you&apos;re interested in, your
              budget range, and a description of your goals. We also record
              the IP address a submission came from, used solely to detect
              and rate-limit automated spam.
            </p>
          </div>

          <div>
            <h2 className="text-ink text-base font-semibold">
              How we use it
            </h2>
            <p className="mt-2">
              Submitted information is used only to respond to your inquiry,
              evaluate whether we&apos;re a good fit for your project, and
              follow up by email. We do not use it for advertising, and we
              do not sell or rent it to third parties.
            </p>
          </div>

          <div>
            <h2 className="text-ink text-base font-semibold">
              Cookies and tracking
            </h2>
            <p className="mt-2">
              This site does not use tracking cookies, third-party
              advertising pixels, or analytics trackers that follow you
              across other sites.
            </p>
          </div>

          <div>
            <h2 className="text-ink text-base font-semibold">
              Where it&apos;s stored
            </h2>
            <p className="mt-2">
              Inquiry submissions are stored in a database we operate
              directly, accessible only to Outbound BD. We don&apos;t share
              database access with any third party.
            </p>
          </div>

          <div>
            <h2 className="text-ink text-base font-semibold">Your rights</h2>
            <p className="mt-2">
              You can ask us to access, correct, or delete any information
              you&apos;ve submitted at any time — email{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-ink decoration-action hover:text-action font-medium underline decoration-2 underline-offset-4 transition-colors"
              >
                {CONTACT_EMAIL}
              </a>{" "}
              and we&apos;ll act on it directly; there&apos;s no automated
              self-service process for this yet.
            </p>
          </div>

          <div>
            <h2 className="text-ink text-base font-semibold">Changes</h2>
            <p className="mt-2">
              If this policy changes materially, we&apos;ll update the date
              above. This page describes our current practice as of that
              date and is not a substitute for independent legal advice.
            </p>
          </div>

          <div>
            <h2 className="text-ink text-base font-semibold">Contact</h2>
            <p className="mt-2">
              Questions about this policy — write to{" "}
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
