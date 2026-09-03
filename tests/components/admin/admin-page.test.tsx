// @vitest-environment jsdom
// Must be the first import — sets MONGODB_URI (and a NEXT_PUBLIC_APP_URL
// default) to an isolated in-memory replica set before page.tsx -> actions.ts
// -> public-env.ts / mongoose.ts are imported. `requireMasterclassAdmin()`
// rate-limits through real Mongo (see admin-auth.ts), so — unlike the
// OrderRow test, which mocks the Server Actions entirely — this file needs a
// genuinely working, isolated database, not just a well-formed connection
// string.
import { mongod } from "../../helpers/mongodb-memory-replset";

import { render, screen } from "@testing-library/react";
import mongoose from "mongoose";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const headersMock = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({ headers: headersMock }));

const listOrdersForReviewMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/masterclass/payment-orders-repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/masterclass/payment-orders-repository")>();
  return { ...actual, listOrdersForReview: listOrdersForReviewMock };
});

import { connectToDatabase } from "@/lib/mongoose";
import { RATE_LIMIT_COLLECTION } from "@/lib/masterclass/rate-limit";
import AdminOrdersPage from "@/app/masterclass/admin/orders/page";

const ADMIN_USER = "qa-admin";
const ADMIN_PASSWORD = "qa-correct-horse-battery-staple";

function basicAuthHeader(user: string, password: string): string {
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

function mockHeaders(authorization: string | null) {
  const map = new Map<string, string>();
  if (authorization !== null) map.set("authorization", authorization);
  map.set("x-forwarded-for", "203.0.113.42");
  headersMock.mockResolvedValue({ get: (key: string) => map.get(key.toLowerCase()) ?? null });
}

describe("AdminOrdersPage", () => {
  beforeEach(async () => {
    const connection = await connectToDatabase();
    await connection.connection.db?.collection(RATE_LIMIT_COLLECTION).deleteMany({});

    vi.unstubAllEnvs();
    vi.stubEnv("MASTERCLASS_ADMIN_USER", ADMIN_USER);
    vi.stubEnv("MASTERCLASS_ADMIN_PASSWORD", ADMIN_PASSWORD);
    vi.stubEnv("MASTERCLASS_RATE_LIMIT_SECRET", "qa-rate-limit-secret");
    vi.stubEnv("MASTERCLASS_ALLOWED_ORIGINS", "https://outboundbd.com");
    listOrdersForReviewMock.mockReset();
    listOrdersForReviewMock.mockResolvedValue({ orders: [], nextCursor: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    headersMock.mockReset();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  it("shows a not-authorized notice and never lists orders when credentials are missing", async () => {
    mockHeaders(null);
    const element = await AdminOrdersPage({ searchParams: Promise.resolve({}) });
    render(element);

    expect(screen.getByText("Not authorized")).toBeInTheDocument();
    expect(listOrdersForReviewMock).not.toHaveBeenCalled();
  });

  it("shows a not-authorized notice for wrong credentials", async () => {
    mockHeaders(basicAuthHeader(ADMIN_USER, "wrong-password"));
    const element = await AdminOrdersPage({ searchParams: Promise.resolve({}) });
    render(element);

    expect(screen.getByText("Not authorized")).toBeInTheDocument();
    expect(listOrdersForReviewMock).not.toHaveBeenCalled();
  });

  it("renders the review queue for correct credentials, with no test/secret value in the output", async () => {
    mockHeaders(basicAuthHeader(ADMIN_USER, ADMIN_PASSWORD));
    listOrdersForReviewMock.mockResolvedValue({
      orders: [
        {
          publicOrderRef: "ord_abc",
          publicRegistrationRef: "MC-2026-000001",
          name: "Test Student",
          email: "student@example.com",
          phone: "+8801700000000",
          method: "NAGAD",
          amount: 1499,
          currency: "BDT",
          manualPayment: null,
          attributionSource: null,
          createdAt: new Date("2026-08-01T00:00:00Z"),
        },
      ],
      nextCursor: null,
    });

    const element = await AdminOrdersPage({ searchParams: Promise.resolve({}) });
    const { container } = render(element);

    expect(screen.getByText("Masterclass — payments awaiting review")).toBeInTheDocument();
    expect(screen.getByText("MC-2026-000001")).toBeInTheDocument();
    expect(container.textContent).not.toContain(ADMIN_PASSWORD);
    expect(container.textContent).not.toContain("qa-rate-limit-secret");
  });

  it("shows an empty-queue message when nothing is waiting", async () => {
    mockHeaders(basicAuthHeader(ADMIN_USER, ADMIN_PASSWORD));
    const element = await AdminOrdersPage({ searchParams: Promise.resolve({}) });
    render(element);
    expect(screen.getByText("Nothing waiting for review right now.")).toBeInTheDocument();
  });

  it("failed-auth rate limiting also blocks page renders: the 21st attempt from the same IP shows not-authorized even with correct credentials", async () => {
    for (let i = 0; i < 21; i++) {
      mockHeaders(basicAuthHeader(ADMIN_USER, ADMIN_PASSWORD));
      const element = await AdminOrdersPage({ searchParams: Promise.resolve({}) });
      if (i === 20) {
        render(element);
      }
    }
    expect(screen.getByText("Not authorized")).toBeInTheDocument();
  }, 30_000);
});
