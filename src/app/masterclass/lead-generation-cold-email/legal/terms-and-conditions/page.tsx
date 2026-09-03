import type { Metadata } from "next";

import { LegalPage } from "@/components/masterclass/legal/LegalPage";
import { termsAndConditions } from "@/data/legal-content";

const canonicalPath = "/masterclass/lead-generation-cold-email/legal/terms-and-conditions";

export const metadata: Metadata = {
  title: { absolute: termsAndConditions.seoTitle },
  description: termsAndConditions.metaDescription,
  alternates: { canonical: canonicalPath },
  robots: { index: false, follow: false },
  openGraph: {
    type: "article",
    url: canonicalPath,
    title: termsAndConditions.seoTitle,
    description: termsAndConditions.metaDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: termsAndConditions.seoTitle,
    description: termsAndConditions.metaDescription,
  },
};

export default function TermsAndConditionsPage() {
  return <LegalPage content={termsAndConditions} />;
}
