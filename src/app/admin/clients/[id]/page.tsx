import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ClientNoteForm } from "@/components/admin/client-note-form";
import { EditClientForm } from "@/components/admin/edit-client-form";
import { PaymentRow } from "@/components/admin/payment-row";
import { RecordPaymentForm } from "@/components/admin/record-payment-form";
import { findClientById } from "@/lib/agency-admin/clients-repository";
import { clientIdSchema } from "@/lib/agency-admin/clients-validation";
import { formatCents } from "@/lib/agency-admin/money";
import { listPaymentsForClient } from "@/lib/agency-admin/payments-repository";
import { utcInstantToDhakaDateOnly } from "@/lib/agency-admin/timezone";

export const metadata: Metadata = {
  title: "Client detail",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface AdminClientDetailPageProps {
  params: Promise<{ id: string }>;
}

function formatDateTime(value: Date): string {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  });
}

export default async function AdminClientDetailPage({ params }: AdminClientDetailPageProps) {
  const { id } = await params;

  const idResult = clientIdSchema.safeParse(id);
  if (!idResult.success) notFound();

  const client = await findClientById(idResult.data);
  if (!client) notFound();

  const payments = await listPaymentsForClient(idResult.data);
  const totalCollectedCents = payments.reduce((sum, payment) => sum + payment.amountCents, 0);
  const notes = [...client.notes].reverse();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/admin/clients" className="text-sm text-blue-700 hover:underline">
        Back to clients
      </Link>

      <h1 className="mt-2 text-xl font-semibold">{client.company}</h1>
      <p className="mt-1 text-sm text-gray-600">
        {client.name} &middot; started {utcInstantToDhakaDateOnly(client.startDate)}
        {client.sourceInquiryId ? (
          <>
            {" "}
            &middot;{" "}
            <Link href={`/admin/leads/${String(client.sourceInquiryId)}`} className="text-blue-700 hover:underline">
              View source lead
            </Link>
          </>
        ) : null}
      </p>

      <section className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Details</h2>
        <div className="mt-3">
          <EditClientForm client={client} />
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-900">Payments</h2>
          <span className="text-sm text-gray-600">
            Collected to date: <span className="font-semibold text-gray-900">{formatCents(totalCollectedCents)}</span>
          </span>
        </div>

        <div className="mt-3">
          <RecordPaymentForm clientId={client.id} />
        </div>

        {payments.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No payments recorded yet.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {payments.map((payment) => (
              <PaymentRow key={payment.id} payment={payment} showClient={false} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Private notes</h2>
        <div className="mt-3">
          <ClientNoteForm id={client.id} />
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
