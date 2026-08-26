import type { PaymentMethodType } from "@/lib/models/payment-method";

const TYPE_LABELS: Record<PaymentMethodType, string> = {
  BD_BANK: "Bangladesh bank account",
  US_BANK: "US bank account",
  UK_BANK: "UK bank account",
  PAYONEER: "Payoneer",
  WISE: "Wise",
};

export type PaymentMethodView = {
  type: PaymentMethodType;
  label: string;
  currency: string;
  beneficiaryName: string;
  details: Record<string, string>;
  instructions?: string | null;
};

// Turns a details key like "accountNumber" into "Account number".
function formatDetailKey(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

export function PaymentMethodDetails({ method }: { method: PaymentMethodView }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase">
        {TYPE_LABELS[method.type]}
      </p>
      <p className="mt-1 text-sm font-semibold text-neutral-900">{method.label}</p>

      <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-neutral-500">Currency</dt>
          <dd className="mt-0.5 text-sm text-neutral-900">{method.currency}</dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">Beneficiary name</dt>
          <dd className="mt-0.5 text-sm text-neutral-900">{method.beneficiaryName}</dd>
        </div>
        {Object.entries(method.details).map(([key, value]) => (
          <div key={key}>
            <dt className="text-xs text-neutral-500">{formatDetailKey(key)}</dt>
            <dd className="mt-0.5 text-sm break-words text-neutral-900">{value}</dd>
          </div>
        ))}
      </dl>

      {method.instructions ? (
        <p className="mt-3 text-sm whitespace-pre-wrap text-neutral-700">
          {method.instructions}
        </p>
      ) : null}
    </div>
  );
}
