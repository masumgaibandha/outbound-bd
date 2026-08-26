import type { Metadata } from "next";

import { PaymentMethodManager } from "@/components/admin/payment-method-manager";
import { PaymentMethod } from "@/lib/models/payment-method";
import { connectToDatabase } from "@/lib/mongoose";

export const metadata: Metadata = {
  title: "Payment methods",
};

export default async function AdminPaymentMethodsPage() {
  await connectToDatabase();
  const methods = await PaymentMethod.find().sort({ createdAt: -1 }).lean();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Payment methods</h2>
        <p className="text-sm text-neutral-500">
          Manage the bank accounts and payout services clients can pay into. Financial details are
          stored only in the database — never in source control.
        </p>
      </div>

      <PaymentMethodManager
        methods={methods.map((method) => ({
          id: String(method._id),
          type: method.type,
          label: method.label,
          currency: method.currency,
          beneficiaryName: method.beneficiaryName,
          details: method.details,
          instructions: method.instructions,
          isActive: method.isActive,
        }))}
      />
    </div>
  );
}
