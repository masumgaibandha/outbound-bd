import Image from "next/image";

import { campaignEvidence } from "@/components/public/campaign-evidence-data";

export function CampaignEvidenceSection() {
  return (
    <ul className="grid gap-6 lg:grid-cols-2">
      {campaignEvidence.map((item) => (
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
