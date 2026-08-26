import type { Metadata } from "next";

import { PlaceholderPanel } from "@/components/dashboard/placeholder-panel";

export const metadata: Metadata = {
  title: "Leads",
};

export default function LeadsPage() {
  return (
    <PlaceholderPanel
      title="Leads"
      description="Your sourced and enriched leads will show up here."
    />
  );
}
