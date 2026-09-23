// @vitest-environment jsdom
// Must be the first import — sets MONGODB_URI to an isolated in-memory
// instance before layout.tsx -> admin-auth.ts -> mongoose.ts are imported.
// `requireAgencyAdmin()` rate-limits through real Mongo.
import { mongod } from "../../helpers/mongodb-memory-server";

import { render, screen } from "@testing-library/react";
import mongoose from "mongoose";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const headersMock = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({ headers: headersMock }));

import { connectToDatabase } from "@/lib/mongoose";
import { RATE_LIMIT_COLLECTION } from "@/lib/masterclass/rate-limit";
import AgencyAdminLayout from "@/app/admin/layout";

const ADMIN_USER = "qa-agency-admin";
const ADMIN_PASSWORD = "qa-correct-horse-battery-staple";

function basicAuthHeader(user: string, password: string): string {
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

function mockHeaders(authorization: string | null) {
  const map = new Map<string, string>();
  if (authorization !== null) map.set("authorization", authorization);
  map.set("x-forwarded-for", "203.0.113.88");
  headersMock.mockResolvedValue({ get: (key: string) => map.get(key.toLowerCase()) ?? null });
}

describe("AgencyAdminLayout", () => {
  beforeEach(async () => {
    const connection = await connectToDatabase();
    await connection.connection.db?.collection(RATE_LIMIT_COLLECTION).deleteMany({});

    vi.unstubAllEnvs();
    vi.stubEnv("AGENCY_ADMIN_USER", ADMIN_USER);
    vi.stubEnv("AGENCY_ADMIN_PASSWORD", ADMIN_PASSWORD);
    vi.stubEnv("AGENCY_ADMIN_RATE_LIMIT_SECRET", "qa-agency-rate-limit-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    headersMock.mockReset();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  it("shows a not-authorized notice and never renders children when credentials are missing", async () => {
    mockHeaders(null);
    const element = await AgencyAdminLayout({ children: <div>Secret leads content</div> });
    render(element);

    expect(screen.getByText("Not authorized")).toBeInTheDocument();
    expect(screen.queryByText("Secret leads content")).not.toBeInTheDocument();
  });

  it("shows a not-authorized notice for wrong credentials", async () => {
    mockHeaders(basicAuthHeader(ADMIN_USER, "wrong-password"));
    const element = await AgencyAdminLayout({ children: <div>Secret leads content</div> });
    render(element);

    expect(screen.getByText("Not authorized")).toBeInTheDocument();
    expect(screen.queryByText("Secret leads content")).not.toBeInTheDocument();
  });

  it("renders the nav and children for correct credentials, with no secret value in the output", async () => {
    mockHeaders(basicAuthHeader(ADMIN_USER, ADMIN_PASSWORD));
    const element = await AgencyAdminLayout({ children: <div>Secret leads content</div> });
    const { container } = render(element);

    expect(screen.getByText("Secret leads content")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Leads")).toBeInTheDocument();
    expect(container.textContent).not.toContain(ADMIN_PASSWORD);
    expect(container.textContent).not.toContain("qa-agency-rate-limit-secret");
  });

  it("renders no script tag referencing the Meta Pixel or Facebook", async () => {
    mockHeaders(basicAuthHeader(ADMIN_USER, ADMIN_PASSWORD));
    const element = await AgencyAdminLayout({ children: <div>content</div> });
    const { container } = render(element);

    expect(container.innerHTML).not.toContain("connect.facebook.net");
    expect(container.innerHTML).not.toContain("fbq(");
  });
});
