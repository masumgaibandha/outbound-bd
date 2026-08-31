import { connectToDatabase } from "@/lib/mongoose";
import { Order } from "@/lib/models/order";
import { PaymentMethod } from "@/lib/models/payment-method";
import { generateOrderNumber } from "@/lib/order-number";
import { buildOrderCatalogSnapshot, getCatalogEntryById } from "@/lib/pricing-catalog";

/** Creates a real AWAITING_PAYMENT order for a given user, from the real catalog. */
export async function createTestOrder(userId: string, catalogId = "launch") {
  await connectToDatabase();
  const entry = getCatalogEntryById(catalogId);
  if (!entry) throw new Error(`Unknown QA catalog id: ${catalogId}`);

  const order = await Order.create({
    orderNumber: generateOrderNumber(),
    userId,
    idempotencyKey: crypto.randomUUID(),
    status: "AWAITING_PAYMENT",
    catalog: buildOrderCatalogSnapshot(entry),
    company: "QA Test Co",
    website: "https://qa-test.example.test",
    country: "Bangladesh",
  });

  return order;
}

export async function createTestPaymentMethod(overrides: Partial<{ currency: string; isActive: boolean }> = {}) {
  await connectToDatabase();
  const method = await PaymentMethod.create({
    type: "US_BANK",
    label: "QA Test Bank",
    currency: overrides.currency ?? "USD",
    beneficiaryName: "QA Test Beneficiary",
    details: { accountNumber: "0000000000", routingNumber: "000000000" },
    isActive: overrides.isActive ?? true,
  });
  return method;
}

export function buildProofFile(name = "proof.png"): File {
  const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG magic bytes
  return new File([bytes], name, { type: "image/png" });
}
