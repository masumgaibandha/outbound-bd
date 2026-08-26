import type { Metadata } from "next";

import { PlaceholderPanel } from "@/components/dashboard/placeholder-panel";

export const metadata: Metadata = {
  title: "Settings",
};

export default function ClientSettingsPage() {
  return (
    <PlaceholderPanel
      title="Settings"
      description="Account and workspace settings will live here."
    />
  );
}
