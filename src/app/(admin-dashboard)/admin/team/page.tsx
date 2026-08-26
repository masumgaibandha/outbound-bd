import type { Metadata } from "next";

import { PlaceholderPanel } from "@/components/dashboard/placeholder-panel";

export const metadata: Metadata = {
  title: "Team",
};

export default function AdminTeamPage() {
  return (
    <PlaceholderPanel
      title="Team"
      description="Manage internal team members and their permissions here."
    />
  );
}
