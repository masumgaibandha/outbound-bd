import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ClientLinkOrCreateForm } from "@/components/admin/client-link-or-create-form";
import { LeadNoteForm } from "@/components/admin/lead-note-form";
import { LeadStatusForm } from "@/components/admin/lead-status-form";
import { findClientBySourceInquiryId } from "@/lib/agency-admin/clients-repository";
import {
  SOURCE_LABELS,
  STATUS_LABELS,
  activeClientsLabel,
  agencyNeedLabel,
  budgetLabel,
  outreachVolumeLabel,
  serviceLabel,
} from "@/lib/agency-admin/labels";
import { findLeadById } from "@/lib/agency-admin/leads-repository";
import { leadIdSchema } from "@/lib/agency-admin/validation";

export const metadata: Metadata = {
  title: "Lead detail",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface AdminLeadDetailPageProps {
  params: Promise<{ id: string }>;
}

function formatDateTime(value: Date): string {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  });
}

export default async function AdminLeadDetailPage({ params }: AdminLeadDetailPageProps) {
  const { id } = await params;

  const idResult = leadIdSchema.safeParse(id);
  if (!idResult.success) notFound();

  const lead = await findLeadById(idResult.data);
  if (!lead) notFound();

  const existingClient = await findClientBySourceInquiryId(idResult.data);

  const statusHistory = [...lead.statusHistory].reverse();
  const notes = [...lead.notes].reverse();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/admin/leads" className="text-sm text-blue-700 hover:underline">
        Back to leads
      </Link>

      <h1 className="mt-2 text-xl font-semibold">{lead.name}</h1>
      <p className="mt-1 text-sm text-gray-600">
        Submitted {formatDateTime(lead.createdAt)} (Asia/Dhaka) via {SOURCE_LABELS[lead.source]}
      </p>

      <section className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Contact</h2>
        <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Field label="Email">
            <a href={`mailto:${lead.email}`} className="text-blue-700 hover:underline">
              {lead.email}
            </a>
          </Field>
          <Field label="Website">
            <a
              href={lead.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 hover:underline"
            >
              {lead.website}
            </a>
          </Field>
          {lead.company ? <Field label="Company">{lead.company}</Field> : null}
        </dl>
      </section>

      <section className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Inquiry details</h2>
        <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Field label="Budget">{budgetLabel(lead.budgetRange)}</Field>
          {lead.service ? <Field label="Service">{serviceLabel(lead.service)}</Field> : null}
          {lead.targetMarket ? <Field label="Target market">{lead.targetMarket}</Field> : null}
          {lead.monthlyOutreachVolume ? (
            <Field label="Monthly outreach volume">{outreachVolumeLabel(lead.monthlyOutreachVolume)}</Field>
          ) : null}
          {lead.currentOutreachSetup ? (
            <Field label="Current outreach setup">{lead.currentOutreachSetup}</Field>
          ) : null}
          {lead.goals ? <Field label="Goals">{lead.goals}</Field> : null}
          {lead.activeClients ? <Field label="Active clients">{activeClientsLabel(lead.activeClients)}</Field> : null}
          {lead.need ? <Field label="Need">{agencyNeedLabel(lead.need)}</Field> : null}
        </dl>
      </section>

      {lead.attribution ? (
        <section className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Attribution</h2>
          <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {lead.attribution.landingPath ? <Field label="Landing path">{lead.attribution.landingPath}</Field> : null}
            {lead.attribution.utmSource ? <Field label="UTM source">{lead.attribution.utmSource}</Field> : null}
            {lead.attribution.utmMedium ? <Field label="UTM medium">{lead.attribution.utmMedium}</Field> : null}
            {lead.attribution.utmCampaign ? <Field label="UTM campaign">{lead.attribution.utmCampaign}</Field> : null}
            {lead.attribution.utmContent ? <Field label="UTM content">{lead.attribution.utmContent}</Field> : null}
            {lead.attribution.utmTerm ? <Field label="UTM term">{lead.attribution.utmTerm}</Field> : null}
            {lead.attribution.fbclid ? <Field label="Facebook click id">{lead.attribution.fbclid}</Field> : null}
          </dl>
        </section>
      ) : null}

      <section className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Status</h2>
        <p className="mt-1 text-sm text-gray-600">Current: {STATUS_LABELS[lead.status]}</p>
        <div className="mt-3">
          <LeadStatusForm id={lead.id} currentStatus={lead.status} />
        </div>

        {statusHistory.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No status changes yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-100 text-sm">
            {statusHistory.map((entry, index) => (
              <li key={index} className="flex items-center justify-between py-1.5">
                <span className="text-gray-700">{STATUS_LABELS[entry.status]}</span>
                <span className="text-gray-500">{formatDateTime(entry.changedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Client</h2>
        <ClientLinkOrCreateForm
          leadId={lead.id}
          leadStatus={lead.status}
          existingClientId={existingClient?.id ?? null}
          defaultName={lead.name}
          defaultCompany={lead.company ?? ""}
          defaultEmail={lead.email}
          defaultWebsite={lead.website}
        />
      </section>

      <section className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Private notes</h2>
        <div className="mt-3">
          <LeadNoteForm id={lead.id} />
        </div>

        {notes.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No notes yet.</p>
        ) : (
          <ul className="mt-4 space-y-3 text-sm">
            {notes.map((note, index) => (
              <li key={index} className="rounded-md bg-gray-50 p-3">
                <p className="whitespace-pre-wrap text-gray-800">{note.text}</p>
                <p className="mt-1 text-xs text-gray-500">{formatDateTime(note.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="text-gray-800">{children}</dd>
    </div>
  );
}
