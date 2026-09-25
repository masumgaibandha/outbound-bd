import type { Metadata } from "next";

import { LandingThankYou } from "@/components/agencies/landing-thank-you";

// noindex, and deliberately absent from src/app/sitemap.ts — this page only
// ever makes sense as the direct result of a form submission, never as a
// standalone discoverable URL.
export const metadata: Metadata = {
  title: "Thanks",
  robots: { index: false, follow: false },
};

export default function AgenciesThankYouPage() {
  return (
    <LandingThankYou
      subtext="Pick a time below and I'll walk through your clients' offer and whether cold email is the right fit."
      utmContent="agencies-cold-email"
    />
  );
}
