import type { Metadata } from "next";

import { Container } from "@/components/public/container";
import { CONTACT_EMAIL } from "@/components/public/site-config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Outbound BD collects, uses, and protects information submitted through this website.",
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "September 22, 2026";

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
              Submitted information is used to respond to your inquiry,
              evaluate whether we&apos;re a good fit for your project, and
              follow up by email. If our advertising tracking is active for
              you (see &ldquo;Cookies and tracking&rdquo; below), we also
              share a one-way, cryptographically hashed version of your
              email address with Meta so we can measure how our own ads
              perform. We do not sell or rent your information to third
              parties.
            </p>
          </div>

          <div>
            <h2 className="text-ink text-base font-semibold">
              Cookies and tracking
            </h2>
            <p className="mt-2">
              This site uses the Meta (Facebook) Pixel and Meta Conversions
              API to measure how our advertising performs. This sends Meta
              information about your visit, such as which pages you viewed,
              whether you submitted our contact form, a cryptographically
              hashed (one-way, not reversible) version of your email address
              if you submitted the form, and identifiers tied to an ad click
              that brought you here (commonly known as fbp/fbc). We also set
              two small first-party cookies of our own: one to remember
              which region you&apos;re browsing from, and one to remember
              your tracking choice if you&apos;ve made one.
            </p>
            <p className="mt-2">
              If you&apos;re visiting from the United Kingdom, the European
              Union, or the European Economic Area, you&apos;ll see a banner
              letting you accept or decline this tracking before the Pixel
              ever loads; your choice is remembered so the banner
              won&apos;t ask again. Visitors elsewhere are tracked by
              default, consistent with how most sites measure their
              advertising. You can change your mind at any time by clearing
              your cookies for this site, and you can block tracking at the
              browser level regardless of where you&apos;re visiting from.
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
