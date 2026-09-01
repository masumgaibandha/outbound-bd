import Image from "next/image";

import type { CampaignEvidenceItem } from "@/components/public/campaign-evidence-data";

type CampaignEvidenceSectionProps = {
  items: readonly CampaignEvidenceItem[];
};

export function CampaignEvidenceSection({ items }: CampaignEvidenceSectionProps) {
  return (
    <ul className="grid gap-6 lg:grid-cols-2">
      {items.map((item) => (
        <li key={item.id} data-reveal>
          <article className="card-static border-hairline bg-surface flex h-full flex-col overflow-hidden border">
            <div className="bg-canvas-alt border-hairline flex items-center justify-center border-b p-5 md:p-6">
              <Image
                src={item.src}
                alt={item.alt}
                // Skips /_next/image on purpose — small local screenshots,
                // no need to depend on Vercel's metered optimization quota.
                unoptimized
                className="h-auto w-full rounded-md"
              />
            </div>
            <div className="flex flex-1 flex-col p-7 md:p-8">
              <span className="border-hairline text-ink-muted mb-3 inline-block w-fit rounded-full border px-2.5 py-1 text-xs font-medium">
                {item.platform}
              </span>
              <p className="text-ink leading-relaxed">{item.caption}</p>
              {item.note ? (
                <p className="text-ink-muted mt-3 text-sm leading-relaxed italic">
                  {item.note}
                </p>
              ) : null}
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}
