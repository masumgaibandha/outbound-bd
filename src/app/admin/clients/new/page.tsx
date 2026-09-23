import type { Metadata } from "next";
import Link from "next/link";

import { CreateClientForm } from "@/components/admin/create-client-form";

export const metadata: Metadata = {
  title: "Add client",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Standalone client creation — no `sourceInquiryId` — for a client who came from a referral, LinkedIn, or cold email rather than through the website. The WON-lead conversion form on a lead's detail page is the other entry point into `createClientAction`; both share this same form component. */
export default function NewClientPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/admin/clients" className="text-sm text-blue-700 hover:underline">
        Back to clients
      </Link>

      <h1 className="mt-2 text-xl font-semibold">Add client</h1>
      <p className="mt-1 text-sm text-gray-600">
        For a client who did not come through a lead on the website (referral, LinkedIn, cold email, etc.).
      </p>

      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
        <CreateClientForm sourceInquiryId={null} navigateOnSuccess />
      </div>
    </main>
  );
}
