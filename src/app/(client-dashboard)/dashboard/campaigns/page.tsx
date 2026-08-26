import type { Metadata } from "next";

import { PlaceholderPanel } from "@/components/dashboard/placeholder-panel";

export const metadata: Metadata = {
  title: "Campaigns",
};

export default function CampaignsPage() {
  return (
    <PlaceholderPanel
      title="Campaigns"
      description="Your cold email campaigns will show up here once they're live."
    />
  );
}
