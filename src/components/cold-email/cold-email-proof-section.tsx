"use client";

import Image from "next/image";
import { useState } from "react";

import {
  COLD_EMAIL_FEEDBACK_ITEM,
  COLD_EMAIL_PROOF_DISCLAIMER,
  COLD_EMAIL_PROOF_ITEMS,
  type ColdEmailProofItem,
} from "@/components/cold-email/cold-email-copy";
import { ButtonLink } from "@/components/public/button";
import { EvidenceLightbox } from "@/components/public/evidence-lightbox";
import { ArrowUpRightIcon, ExpandIcon } from "@/components/public/icons";
import { Section } from "@/components/public/section";
import {
  EXTERNAL_LINK_PROPS,
  LINKEDIN_PROFILE_URL,
  UPWORK_PROFILE_URL,
} from "@/components/public/site-config";

export const COLD_EMAIL_PROOF_ID = "proof";

type OpenLightbox = {
  items: readonly ColdEmailProofItem[];
  index: number;
  trigger: HTMLElement;
};

// Figures like 5.6K, 83.9%, 3,907 or 95%+ inside a caption.
const FIGURE_PATTERN = /(\d[\d,.]*(?:K|%\+?)?)/;

/** Renders a plain caption with every figure bolded, so numbers stand out when scanning. */
function ProofCaption({ text }: { text: string }) {
  return (
    <>
      {text.split(FIGURE_PATTERN).map((part, index) =>
        index % 2 === 1 ? (
          <strong key={index} className="text-ink font-semibold">
            {part}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  );
}

function ProofLabel({ children }: { children: string }) {
  return (
    <p className="text-action text-xs font-semibold tracking-[0.14em] uppercase">{children}</p>
  );
}

function EnlargeableScreenshot({
  item,
  sizes,
  onOpen,
}: {
  item: ColdEmailProofItem;
  sizes: string;
  onOpen: (trigger: HTMLElement) => void;
}) {
  const image = item.cardSrc ?? item.src;

  return (
    <button
      type="button"
      onClick={(event) => onOpen(event.currentTarget)}
      aria-label={`Enlarge screenshot: ${item.alt}`}
      className="group border-hairline focus-visible:outline-action relative block w-full cursor-zoom-in overflow-hidden rounded-lg border bg-white focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <Image
        src={image}
        alt={item.alt}
        width={image.width}
        height={image.height}
        sizes={sizes}
        loading="lazy"
        unoptimized
        // Never upscaled past its own pixels (the small Smartlead crop), so it stays sharp.
        style={{ maxWidth: image.width }}
        className="mx-auto h-auto w-full"
      />
      <span
        aria-hidden="true"
        className="bg-surface text-ink absolute right-3 bottom-3 inline-flex size-9 items-center justify-center rounded-full shadow-md transition-transform duration-200 group-hover:scale-110 motion-reduce:transition-none"
      >
        <ExpandIcon width={16} height={16} />
      </span>
    </button>
  );
}

const CARD_CLASS =
  "border-hairline bg-surface flex flex-col gap-4 rounded-2xl border p-4 shadow-[0_1px_2px_rgb(26_24_21/0.05),0_12px_28px_-16px_rgb(26_24_21/0.22)] md:p-5";

/**
 * Four campaign screenshots and the Upwork feedback screenshot, each opening
 * the shared EvidenceLightbox. The four campaign cards share one lightbox so
 * visitors can step between them; the feedback image opens on its own.
 */
export function ColdEmailProofSection() {
  const [open, setOpen] = useState<OpenLightbox | null>(null);

  return (
    <Section
      id={COLD_EMAIL_PROOF_ID}
      tone="canvas"
      labelledBy="cold-email-proof-heading"
      className="bg-accent/55 border-hairline border-y"
    >
      <div className="mx-auto max-w-3xl text-center" data-reveal>
        <p className="text-action flex items-center justify-center gap-3 text-xs font-semibold tracking-[0.18em] uppercase">
          <span aria-hidden="true" className="bg-action h-px w-8 shrink-0" />
          Proof
        </p>
        <h2 id="cold-email-proof-heading" className="type-section text-ink mt-5 text-balance">
          Real campaigns, real numbers
        </h2>
        <p className="text-ink-muted mx-auto mt-5 max-w-prose text-base leading-relaxed md:text-lg">
          Every screenshot below is from a live client campaign.
        </p>
      </div>

      <ul className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8" data-testid="cold-email-proof-grid">
        {COLD_EMAIL_PROOF_ITEMS.map((item, index) => (
          <li key={item.id} data-reveal>
            <figure className={`${CARD_CLASS} h-full`}>
              <ProofLabel>{item.label}</ProofLabel>
              <EnlargeableScreenshot
                item={item}
                sizes="(min-width: 768px) 50vw, 100vw"
                onOpen={(trigger) => setOpen({ items: COLD_EMAIL_PROOF_ITEMS, index, trigger })}
              />
              <figcaption className="text-ink-muted text-sm leading-relaxed md:text-base">
                <ProofCaption text={item.caption} />
                {item.note ? <span className="mt-1 block text-xs italic">{item.note}</span> : null}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>

      <p className="text-ink-muted mx-auto mt-8 max-w-2xl text-center text-xs leading-relaxed md:text-sm">
        {COLD_EMAIL_PROOF_DISCLAIMER}
      </p>

      <div className="mx-auto mt-20 max-w-3xl">
        <h3 className="font-heading text-ink text-center text-2xl md:text-3xl" data-reveal>
          What clients say
        </h3>

        <figure className={`${CARD_CLASS} mt-8`} data-reveal>
          <ProofLabel>{COLD_EMAIL_FEEDBACK_ITEM.label}</ProofLabel>
          <EnlargeableScreenshot
            item={COLD_EMAIL_FEEDBACK_ITEM}
            sizes="(min-width: 768px) 48rem, 100vw"
            onOpen={(trigger) => setOpen({ items: [COLD_EMAIL_FEEDBACK_ITEM], index: 0, trigger })}
          />
        </figure>

        {/* Mirrors the hero pair: Upwork filled like "Get the details",
            LinkedIn outlined like "Book a call". The grid keeps both equal
            width: stacked full width on mobile, two columns from sm up. */}
        <div className="mx-auto mt-8 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
          <ButtonLink href={UPWORK_PROFILE_URL} tone="action" size="lg" fullWidth {...EXTERNAL_LINK_PROPS}>
            See the full Upwork profile
            <ArrowUpRightIcon width={16} height={16} aria-hidden="true" />
          </ButtonLink>
          <ButtonLink href={LINKEDIN_PROFILE_URL} tone="outline" size="lg" fullWidth {...EXTERNAL_LINK_PROPS}>
            Connect on LinkedIn
            <ArrowUpRightIcon width={16} height={16} aria-hidden="true" />
          </ButtonLink>
        </div>
      </div>

      {open ? (
        <EvidenceLightbox
          items={open.items}
          activeIndex={open.index}
          triggerElement={open.trigger}
          onClose={() => setOpen(null)}
          onNavigate={(index) => setOpen((current) => (current ? { ...current, index } : current))}
          renderMeta={(item) => (
            <span className="text-action font-semibold tracking-[0.12em] uppercase">{item.label}</span>
          )}
        />
      ) : null}
    </Section>
  );
}
