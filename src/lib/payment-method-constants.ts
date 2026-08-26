// Plain data constants shared by the Mongoose model (payment-method.ts,
// server-only) and client-side UI (admin payment method form). Kept in a
// module with no server-only / mongoose imports so client components can
// import the runtime arrays without pulling the database driver into the
// browser bundle.

export const PAYMENT_METHOD_TYPES = [
  "BD_BANK",
  "US_BANK",
  "UK_BANK",
  "PAYONEER",
  "WISE",
] as const;

export type PaymentMethodType = (typeof PAYMENT_METHOD_TYPES)[number];

export const PAYMENT_METHOD_CURRENCIES = ["USD", "GBP", "BDT", "EUR"] as const;
export type PaymentMethodCurrency = (typeof PAYMENT_METHOD_CURRENCIES)[number];
