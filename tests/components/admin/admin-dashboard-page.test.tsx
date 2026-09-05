// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const countOrdersByStatusMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/masterclass/payment-orders-repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/masterclass/payment-orders-repository")>();
  return { ...actual, countOrdersByStatus: countOrdersByStatusMock };
});

const countTotalRegistrationsMock = vi.hoisted(() => vi.fn());
const countEnrolledRegistrationsMock = vi.hoisted(() => vi.fn());
const countRegistrationsByStatusMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/masterclass/registrations-repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/masterclass/registrations-repository")>();
  return {
    ...actual,
    countTotalRegistrations: countTotalRegistrationsMock,
    countEnrolledRegistrations: countEnrolledRegistrationsMock,
    countRegistrationsByStatus: countRegistrationsByStatusMock,
  };
});

const countStudentsMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/masterclass/students-repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/masterclass/students-repository")>();
  return { ...actual, countStudents: countStudentsMock };
});

import MasterclassAdminDashboardPage from "@/app/masterclass/admin/page";

describe("MasterclassAdminDashboardPage", () => {
  beforeEach(() => {
    countStudentsMock.mockResolvedValue(3);
    countTotalRegistrationsMock.mockResolvedValue(10);
    countEnrolledRegistrationsMock.mockResolvedValue(4);
    countRegistrationsByStatusMock.mockImplementation((status: string) =>
      Promise.resolve(status === "PENDING_PAYMENT" ? 6 : 0),
    );
    countOrdersByStatusMock.mockImplementation((status: string) =>
      Promise.resolve({ REVIEW: 2, REJECTED: 1, PAID: 5 }[status] ?? 0),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders every count from the actual, existing status values — never invented or mapped incorrectly", async () => {
    const element = await MasterclassAdminDashboardPage();
    render(element);

    expect(screen.getByText("Unique students")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();

    expect(screen.getByText("Total registrations/enrollments")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();

    expect(screen.getByText("Enrolled")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();

    expect(screen.getByText("Pending payment")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();

    expect(screen.getByText("Awaiting payment review")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    expect(screen.getByText("Rejected")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();

    expect(screen.getByText("Paid orders")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();

    expect(countRegistrationsByStatusMock).toHaveBeenCalledWith("PENDING_PAYMENT");
    expect(countOrdersByStatusMock).toHaveBeenCalledWith("REVIEW");
    expect(countOrdersByStatusMock).toHaveBeenCalledWith("REJECTED");
    expect(countOrdersByStatusMock).toHaveBeenCalledWith("PAID");
  });
});
