import type { Metadata } from "next";

import { LegalPage } from "@/components/masterclass/legal/LegalPage";
import { privacyPolicy } from "@/data/legal-content";

const canonicalPath = "/masterclass/lead-generation-cold-email/legal/privacy-policy";

export const metadata: Metadata = {
  title: { absolute: privacyPolicy.seoTitle },
  description: privacyPolicy.metaDescription,
  alternates: { canonical: canonicalPath },
  robots: { index: false, follow: false },
  openGraph: {
    type: "article",
    url: canonicalPath,
    title: privacyPolicy.seoTitle,
    description: privacyPolicy.metaDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: privacyPolicy.seoTitle,
    description: privacyPolicy.metaDescription,
  },
};

export default function PrivacyPolicyPage() {
  return <LegalPage content={privacyPolicy} />;
}
