import type { Metadata } from "next";

import { LandingThankYou } from "@/components/agencies/landing-thank-you";

// noindex, and deliberately absent from src/app/sitemap.ts — same reasoning
// as /agencies/thank-you: only meaningful right after a form submission.
export const metadata: Metadata = {
  title: "Thanks",
  robots: { index: false, follow: false },
};

export default function ColdEmailThankYouPage() {
  return (
    <LandingThankYou
      subtext="Pick a time below and I'll walk through your offer and whether cold email is the right fit."
      utmContent="cold-email-page"
      defaultUtmCampaign="cold-email"
    />
  );
}
