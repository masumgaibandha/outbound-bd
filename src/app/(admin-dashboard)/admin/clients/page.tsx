import type { Metadata } from "next";

import { PlaceholderPanel } from "@/components/dashboard/placeholder-panel";

export const metadata: Metadata = {
  title: "Clients",
};

export default function AdminClientsPage() {
  return (
    <PlaceholderPanel
      title="Clients"
      description="Manage client accounts and their outbound programs here."
    />
  );
}
