import Link from "next/link";

import { CampaignEvidenceSection } from "@/components/public/campaign-evidence-section";
import { SectionHeading } from "@/components/public/section-heading";
import { Section } from "@/components/public/section";

/**
 * Homepage's single Results section — real evidence from the founder's
 * independent client work, framed positively, plus one honest line about
 * Outbound BD's own agency case studies (in progress). Full methodology
 * and the case-study placeholder format live on /results.
 */
export function CampaignEvidencePreviewSection() {
  return (
    <Section id="results" tone="canvas" labelledBy="results-heading">
      <SectionHeading
        eyebrow="Results"
        title="Real evidence from real outreach work"
        description="Selected results from Abdullah Al Masum's independent client work — the same discipline every Outbound BD engagement runs on."
      />

      <div className="mt-14">
        <CampaignEvidenceSection />
      </div>

      <div className="border-hairline mt-10 flex flex-col gap-4 border-t pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-ink-muted max-w-xl text-sm leading-relaxed">
          Outbound BD&apos;s own client case studies are published as
          engagements complete and clients approve the figures.
        </p>
        <Link
          href="/results"
          className="text-ink decoration-action hover:text-action focus-visible:outline-action shrink-0 rounded-sm text-sm font-medium underline decoration-2 underline-offset-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          See all results →
        </Link>
      </div>
    </Section>
  );
}
