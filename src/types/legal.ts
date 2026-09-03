/** Masterclass-specific legal-page content types. Ported verbatim from the MasumDev masterclass source. */
export interface LegalSection {
  id: string;
  heading: string;
  paragraphs: readonly string[];
  /** Optional bullet list rendered after the paragraphs. */
  items?: readonly string[];
}

export interface LegalPageContent {
  slug: string;
  seoTitle: string;
  metaDescription: string;
  eyebrow: string;
  /** The page's only h1. */
  heading: string;
  intro: readonly string[];
  sections: readonly LegalSection[];
}

export interface LegalPageLink {
  slug: string;
  label: string;
  href: string;
}
