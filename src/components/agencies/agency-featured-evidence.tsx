"use client";

import Image from "next/image";
import { useState } from "react";

import type { CampaignEvidenceItem } from "@/components/public/campaign-evidence-data";
import { CampaignEvidenceLightbox } from "@/components/public/campaign-evidence-lightbox";
import { ExpandIcon } from "@/components/public/icons";

/**
 * One screenshot shown wide enough to read, with the shared lightbox for a
 * full-size view. Not `CampaignEvidenceSection`: with a single item that
 * component switches to a side-by-side card, which halves the screenshot's
 * width on desktop. The caller passes the item with this page's own caption.
 */
export function AgencyFeaturedEvidence({ item }: { item: CampaignEvidenceItem }) {
  const [trigger, setTrigger] = useState<HTMLElement | null>(null);
  const items = [item];

  return (
    <figure className="mx-auto max-w-4xl" data-reveal>
      <button
        type="button"
        onClick={(event) => setTrigger(event.currentTarget)}
        aria-label={`Enlarge screenshot: ${item.alt}`}
        className="group border-hairline bg-surface focus-visible:outline-action relative block w-full border p-3 focus-visible:outline-2 focus-visible:outline-offset-2 md:p-4"
      >
        <Image src={item.src} alt="" unoptimized className="h-auto w-full rounded-md" />
        <span
          aria-hidden="true"
          className="bg-surface text-ink absolute right-5 bottom-5 inline-flex size-10 items-center justify-center rounded-full shadow-md transition-transform duration-200 group-hover:scale-110 motion-reduce:transition-none md:right-6 md:bottom-6"
        >
          <ExpandIcon width={18} height={18} />
        </span>
      </button>

      <figcaption className="mt-4 text-center">
        <p className="text-ink text-sm md:text-base">{item.caption}</p>
        {item.note ? (
          <p className="text-ink-muted mt-1 text-xs italic">{item.note}</p>
        ) : null}
      </figcaption>

      {trigger ? (
        <CampaignEvidenceLightbox
          items={items}
          activeIndex={0}
          triggerElement={trigger}
          onClose={() => setTrigger(null)}
          onNavigate={() => {}}
        />
      ) : null}
    </figure>
  );
}
