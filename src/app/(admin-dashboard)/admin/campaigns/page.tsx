import type { Metadata } from "next";

import { PlaceholderPanel } from "@/components/dashboard/placeholder-panel";

export const metadata: Metadata = {
  title: "Campaigns",
};

export default function AdminCampaignsPage() {
  return (
    <PlaceholderPanel
      title="Campaigns"
      description="Oversee every client's active and past campaigns here."
    />
  );
}
