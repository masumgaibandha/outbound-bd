import Link from "next/link";

import { CreateClientForm } from "@/components/admin/create-client-form";
import type { InquiryStatus } from "@/lib/models/inquiry";

/**
 * The lead detail page's "Create client" / "View client" branch — a Server
 * Component (no client-side state of its own) that decides which of three
 * states to render, computed by the page from a single
 * `findClientBySourceInquiryId()` lookup: a link to the existing client, the
 * prefilled create form (only once the lead is WON), or a neutral message
 * otherwise. "Never create a client automatically, never a duplicate" is
 * enforced by construction here — the form only ever renders when
 * `existingClientId` is `null`.
 */
export function ClientLinkOrCreateForm({
  leadId,
  leadStatus,
  existingClientId,
  defaultName,
  defaultCompany,
  defaultEmail,
  defaultWebsite,
}: {
  leadId: string;
  leadStatus: InquiryStatus;
  existingClientId: string | null;
  defaultName: string;
  defaultCompany: string;
  defaultEmail: string;
  defaultWebsite: string;
}) {
  if (existingClientId) {
    return (
      <p className="mt-2 text-sm text-gray-600">
        This lead is linked to a client.{" "}
        <Link href={`/admin/clients/${existingClientId}`} className="font-medium text-blue-700 hover:underline">
          View client &rarr;
        </Link>
      </p>
    );
  }

  if (leadStatus !== "WON") {
    return <p className="mt-2 text-sm text-gray-500">Available once this lead is marked Won.</p>;
  }

  return (
    <div className="mt-3">
      <CreateClientForm
        sourceInquiryId={leadId}
        defaultName={defaultName}
        defaultCompany={defaultCompany}
        defaultEmail={defaultEmail}
        defaultWebsite={defaultWebsite}
      />
    </div>
  );
}
