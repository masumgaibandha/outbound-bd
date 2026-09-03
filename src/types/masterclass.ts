import type { StaticImageData } from "next/image";

/**
 * UI-content types for the masterclass sales page. Kept separate from
 * `src/types/masterclass-persistence.ts` (database document shapes) so a
 * copy change is never mistaken for a schema change. Ported verbatim from
 * the MasumDev masterclass source — `src/lib/masterclass/constants.ts` owns
 * slug/batchId/pricing/dates authoritatively; nothing here duplicates them.
 */
export interface MasterclassConfig {
  /** True once a payment path exists behind the form — manual bKash/Nagad/Rocket, as of Batch 1. */
  checkoutEnabled: boolean;
}

export interface OfferDetail {
  label: string;
}

export interface TrustMetric {
  value: string;
  label: string;
}

export interface CurriculumDay {
  id: string;
  dayLabel: string;
  heading: string;
  items: readonly string[];
}

export interface WorkflowStep {
  label: string;
}

/**
 * A sanitized derivative, never a raw/unredacted file. `src` is a
 * `StaticImageData` for an asset imported directly from `src/assets/` (the
 * agency's own already-audited evidence, reused rather than duplicated into
 * `public/masterclass/`) or a plain path string for one that still lives
 * under `public/masterclass/`. `width`/`height` were dropped — the only
 * renderer (`ResultsProof.tsx`) always uses Next's `fill` layout, so they
 * were dead fields even when this only supported path strings.
 */
export interface ProofAsset {
  id: string;
  src: string | StaticImageData;
  alt: string;
  caption: string;
  /** An interpretive caveat ("one specific test, not a guarantee") rendered distinctly below the caption — omit when the caption already carries its own caveat inline. */
  note?: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

/** An external, verifiable public profile — always opens in a new tab. */
export interface ProfileLink {
  label: string;
  href: string;
}

/** Bengali display copy for one manual payment channel — the account number itself always comes from env, never from here. */
export interface ManualPaymentMethodCopy {
  label: string;
  instructions: string;
}
