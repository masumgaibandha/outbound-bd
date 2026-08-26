import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongoose";
import { createOrderRequestSchema } from "@/lib/order-schema";
import { buildOrderCatalogSnapshot, getCatalogEntryById } from "@/lib/pricing-catalog";
import { generateOrderNumber } from "@/lib/order-number";
import { Order } from "@/lib/models/order";

const MAX_ORDER_NUMBER_ATTEMPTS = 5;

function isDuplicateKeyError(
  error: unknown,
): error is { code: number; keyPattern?: Record<string, unknown> } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === 11000
  );
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Sign in to place an order." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request body." },
      { status: 400 },
    );
  }

  const parsed = createOrderRequestSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] ??= issue.message;
    }
    return NextResponse.json(
      { ok: false, message: "Please fix the errors below.", fieldErrors },
      { status: 400 },
    );
  }

  // Catalog id is resolved server-side ONLY — name, price, and scope are
  // never taken from the request body, no matter what the client sends.
  const catalogEntry = getCatalogEntryById(parsed.data.catalogId);
  if (!catalogEntry) {
    return NextResponse.json(
      { ok: false, message: "That item is no longer available to order." },
      { status: 400 },
    );
  }

  await connectToDatabase();

  // Idempotency: if this exact key was already used (e.g. a double-submit
  // or a retried request after a network blip), return the order that
  // already exists instead of creating a second one.
  const existing = await Order.findOne({
    idempotencyKey: parsed.data.idempotencyKey,
  });
  if (existing) {
    if (existing.userId !== session.user.id) {
      // A reused key belonging to a different user is a client bug, not a
      // legitimate replay — refuse rather than hand back someone else's order.
      return NextResponse.json(
        { ok: false, message: "This request could not be processed." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { ok: true, orderId: String(existing._id), orderNumber: existing.orderNumber },
      { status: 200 },
    );
  }

  const snapshot = buildOrderCatalogSnapshot(catalogEntry);

  for (let attempt = 0; attempt < MAX_ORDER_NUMBER_ATTEMPTS; attempt += 1) {
    try {
      const order = await Order.create({
        orderNumber: generateOrderNumber(),
        userId: session.user.id,
        idempotencyKey: parsed.data.idempotencyKey,
        status: "AWAITING_PAYMENT",
        catalog: snapshot,
        company: parsed.data.company,
        website: parsed.data.website,
        country: parsed.data.country,
        notes: parsed.data.notes || undefined,
      });
      return NextResponse.json(
        { ok: true, orderId: String(order._id), orderNumber: order.orderNumber },
        { status: 201 },
      );
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        if (error.keyPattern && "idempotencyKey" in error.keyPattern) {
          // Lost a race with a concurrent request using the same key —
          // fetch and return what that request created.
          const raced = await Order.findOne({
            idempotencyKey: parsed.data.idempotencyKey,
          });
          if (raced) {
            return NextResponse.json(
              { ok: true, orderId: String(raced._id), orderNumber: raced.orderNumber },
              { status: 200 },
            );
          }
        }
        if (error.keyPattern && "orderNumber" in error.keyPattern) {
          continue; // extremely rare collision — regenerate and retry
        }
      }
      throw error;
    }
  }

  return NextResponse.json(
    { ok: false, message: "Something went wrong. Please try again." },
    { status: 500 },
  );
}
