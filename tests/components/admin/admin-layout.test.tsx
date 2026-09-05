// @vitest-environment jsdom
// Must be the first import — sets MONGODB_URI to an isolated in-memory
// replica set before layout.tsx -> admin-auth.ts -> mongoose.ts are
// imported. `requireMasterclassAdmin()` rate-limits through real Mongo, so
// this needs a genuinely working, isolated database — same reasoning as
// the existing AdminOrdersPage test this file mirrors.
import { mongod } from "../../helpers/mongodb-memory-replset";

import { render, screen } from "@testing-library/react";
import mongoose from "mongoose";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const headersMock = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({ headers: headersMock }));

import { connectToDatabase } from "@/lib/mongoose";
import { RATE_LIMIT_COLLECTION } from "@/lib/masterclass/rate-limit";
import MasterclassAdminLayout from "@/app/masterclass/admin/layout";

const ADMIN_USER = "qa-admin";
const ADMIN_PASSWORD = "qa-correct-horse-battery-staple";

function basicAuthHeader(user: string, password: string): string {
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

function mockHeaders(authorization: string | null) {
  const map = new Map<string, string>();
  if (authorization !== null) map.set("authorization", authorization);
  map.set("x-forwarded-for", "203.0.113.77");
  headersMock.mockResolvedValue({ get: (key: string) => map.get(key.toLowerCase()) ?? null });
}

describe("MasterclassAdminLayout", () => {
  beforeEach(async () => {
    const connection = await connectToDatabase();
    await connection.connection.db?.collection(RATE_LIMIT_COLLECTION).deleteMany({});

    vi.unstubAllEnvs();
    vi.stubEnv("MASTERCLASS_ADMIN_USER", ADMIN_USER);
    vi.stubEnv("MASTERCLASS_ADMIN_PASSWORD", ADMIN_PASSWORD);
    vi.stubEnv("MASTERCLASS_RATE_LIMIT_SECRET", "qa-rate-limit-secret");
    vi.stubEnv("MASTERCLASS_ALLOWED_ORIGINS", "https://outboundbd.com");
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
    const element = await MasterclassAdminLayout({ children: <div>Secret dashboard content</div> });
    render(element);

    expect(screen.getByText("Not authorized")).toBeInTheDocument();
    expect(screen.queryByText("Secret dashboard content")).not.toBeInTheDocument();
  });

  it("shows a not-authorized notice for wrong credentials", async () => {
    mockHeaders(basicAuthHeader(ADMIN_USER, "wrong-password"));
    const element = await MasterclassAdminLayout({ children: <div>Secret dashboard content</div> });
    render(element);

    expect(screen.getByText("Not authorized")).toBeInTheDocument();
    expect(screen.queryByText("Secret dashboard content")).not.toBeInTheDocument();
  });

  it("renders the nav and children for correct credentials, with no secret value in the output", async () => {
    mockHeaders(basicAuthHeader(ADMIN_USER, ADMIN_PASSWORD));
    const element = await MasterclassAdminLayout({ children: <div>Secret dashboard content</div> });
    const { container } = render(element);

    expect(screen.getByText("Secret dashboard content")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Students")).toBeInTheDocument();
    expect(screen.getByText("Enrollments")).toBeInTheDocument();
    expect(screen.getByText("Payment Reviews")).toBeInTheDocument();
    expect(container.textContent).not.toContain(ADMIN_PASSWORD);
    expect(container.textContent).not.toContain("qa-rate-limit-secret");
  });

  it("shows Programs/Batches/Sessions/Emails as plain non-interactive text, never a link", async () => {
    mockHeaders(basicAuthHeader(ADMIN_USER, ADMIN_PASSWORD));
    const element = await MasterclassAdminLayout({ children: <div>content</div> });
    const { container } = render(element);

    for (const label of ["Programs", "Batches", "Sessions", "Emails"]) {
      const node = screen.getByText(label);
      expect(node.closest("a")).toBeNull();
    }
    // Dashboard/Students/Enrollments/Payment Reviews ARE real links.
    expect(container.querySelectorAll("a").length).toBe(4);
  });
});
