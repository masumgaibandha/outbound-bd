import { Section } from "@/components/public/section";
import { SectionHeading } from "@/components/public/section-heading";

export function AgencyComparisonSection() {
  return (
    <Section tone="canvasAlt" labelledBy="comparison-heading">
      <SectionHeading title="Cold email is not email marketing" />

      <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="border-hairline bg-canvas border p-8" data-reveal>
          <h3 className="text-ink text-lg font-semibold">Email marketing</h3>
          <p className="text-ink-muted mt-3 leading-relaxed">
            Newsletters and promotions sent to people who already signed
            up, using tools like Mailchimp or Klaviyo.
          </p>
        </div>

        <div className="border-hairline bg-surface border p-8" data-reveal>
          <h3 className="text-ink text-lg font-semibold">Cold email</h3>
          <p className="text-ink-muted mt-3 leading-relaxed">
            Short, personal emails to hand-picked prospects who don&apos;t
            know your client yet. Sent from separate domains so your
            client&apos;s main domain stays safe. The goal is booked sales
            calls, not clicks.
          </p>
        </div>
      </div>
    </Section>
  );
}
