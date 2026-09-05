// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const listEnrollmentsPageMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/masterclass/registrations-repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/masterclass/registrations-repository")>();
  return { ...actual, listEnrollmentsPage: listEnrollmentsPageMock };
});

import MasterclassAdminEnrollmentsPage from "@/app/masterclass/admin/enrollments/page";
import { ADMIN_PAGE_SIZE } from "@/lib/masterclass/pagination";

describe("MasterclassAdminEnrollmentsPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders a linked enrollment's Student ID, batch, snapshot, status, and created date", async () => {
    listEnrollmentsPageMock.mockResolvedValue({
      registrations: [
        {
          publicRegistrationRef: "MC-2026-ABCD1234",
          studentId: "irrelevant-for-display",
          linkedPublicStudentId: "STU-234567892C",
          batchId: "lead-generation-cold-email-2026-10",
          name: "Test Student",
          email: "student@example.com",
          phone: "+8801700000000",
          status: "ENROLLED",
          createdAt: new Date("2026-08-01T00:00:00Z"),
        },
      ],
      totalCount: 1,
    });

    const element = await MasterclassAdminEnrollmentsPage({ searchParams: Promise.resolve({}) });
    render(element);

    expect(screen.getByText("MC-2026-ABCD1234")).toBeInTheDocument();
    expect(screen.getByText("STU-234567892C")).toBeInTheDocument();
    expect(screen.getByText("lead-generation-cold-email-2026-10")).toBeInTheDocument();
    expect(screen.getByText("Test Student")).toBeInTheDocument();
    expect(screen.getByText("ENROLLED")).toBeInTheDocument();
  });

  it("renders a legacy registration with no studentId as 'Not linked' rather than crashing", async () => {
    listEnrollmentsPageMock.mockResolvedValue({
      registrations: [
        {
          publicRegistrationRef: "MC-2026-000001",
          studentId: null,
          linkedPublicStudentId: null,
          batchId: "lead-generation-cold-email-2026-10",
          name: "Legacy Student",
          email: "legacy@example.com",
          phone: "+8801700000001",
          status: "PENDING_PAYMENT",
          createdAt: new Date("2026-01-01T00:00:00Z"),
        },
      ],
      totalCount: 1,
    });

    const element = await MasterclassAdminEnrollmentsPage({ searchParams: Promise.resolve({}) });
    render(element);

    expect(screen.getByText("Not linked")).toBeInTheDocument();
    expect(screen.getByText("Legacy Student")).toBeInTheDocument();
  });

  it("requests the fixed 50-row page size and clamps an invalid page param", async () => {
    listEnrollmentsPageMock.mockResolvedValue({ registrations: [], totalCount: 0 });

    await MasterclassAdminEnrollmentsPage({ searchParams: Promise.resolve({ page: "abc" }) });
    expect(listEnrollmentsPageMock).toHaveBeenCalledWith(1, ADMIN_PAGE_SIZE);

    await MasterclassAdminEnrollmentsPage({ searchParams: Promise.resolve({ page: "2" }) });
    expect(listEnrollmentsPageMock).toHaveBeenCalledWith(2, ADMIN_PAGE_SIZE);
  });

  it("shows an empty-state message when there are no enrollments yet", async () => {
    listEnrollmentsPageMock.mockResolvedValue({ registrations: [], totalCount: 0 });
    const element = await MasterclassAdminEnrollmentsPage({ searchParams: Promise.resolve({}) });
    render(element);
    expect(screen.getByText("No enrollments yet.")).toBeInTheDocument();
  });
});
