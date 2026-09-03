import type { Metadata } from "next";

import { LegalPage } from "@/components/masterclass/legal/LegalPage";
import { refundPolicy } from "@/data/legal-content";

const canonicalPath = "/masterclass/lead-generation-cold-email/legal/refund-policy";

export const metadata: Metadata = {
  title: { absolute: refundPolicy.seoTitle },
  description: refundPolicy.metaDescription,
  alternates: { canonical: canonicalPath },
  robots: { index: false, follow: false },
  openGraph: {
    type: "article",
    url: canonicalPath,
    title: refundPolicy.seoTitle,
    description: refundPolicy.metaDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: refundPolicy.seoTitle,
    description: refundPolicy.metaDescription,
  },
};

export default function RefundPolicyPage() {
  return <LegalPage content={refundPolicy} />;
}
