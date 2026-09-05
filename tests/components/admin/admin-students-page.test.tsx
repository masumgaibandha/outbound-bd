// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const listStudentsPageMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/masterclass/students-repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/masterclass/students-repository")>();
  return { ...actual, listStudentsPage: listStudentsPageMock };
});

import MasterclassAdminStudentsPage from "@/app/masterclass/admin/students/page";
import { ADMIN_PAGE_SIZE } from "@/lib/masterclass/pagination";

describe("MasterclassAdminStudentsPage", () => {
  beforeEach(() => {
    listStudentsPageMock.mockResolvedValue({
      students: [
        {
          publicStudentId: "STU-234567892C",
          name: "Test Student",
          email: "student@example.com",
          phone: "+8801700000000",
          firstEnrolledAt: new Date("2026-08-01T00:00:00Z"),
          enrollmentCount: 2,
        },
      ],
      totalCount: 1,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders Student ID, name, email, phone, first-enrolled date, and enrollment count — never a full document or a secret", async () => {
    const element = await MasterclassAdminStudentsPage({ searchParams: Promise.resolve({}) });
    const { container } = render(element);

    expect(screen.getByText("STU-234567892C")).toBeInTheDocument();
    expect(screen.getByText("Test Student")).toBeInTheDocument();
    expect(screen.getByText("student@example.com")).toBeInTheDocument();
    expect(screen.getByText("+8801700000000")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // enrollment count
    expect(container.textContent).not.toContain("publicStudentId:"); // never a raw document dump
  });

  it("requests the fixed 50-row page size, never a client-controllable value", async () => {
    await MasterclassAdminStudentsPage({ searchParams: Promise.resolve({}) });
    expect(listStudentsPageMock).toHaveBeenCalledWith(1, ADMIN_PAGE_SIZE);
    expect(ADMIN_PAGE_SIZE).toBe(50);
  });

  it("clamps a non-numeric page param to 1 instead of passing it through raw", async () => {
    await MasterclassAdminStudentsPage({ searchParams: Promise.resolve({ page: "not-a-number" }) });
    expect(listStudentsPageMock).toHaveBeenCalledWith(1, ADMIN_PAGE_SIZE);
  });

  it("clamps a negative page param to 1", async () => {
    await MasterclassAdminStudentsPage({ searchParams: Promise.resolve({ page: "-5" }) });
    expect(listStudentsPageMock).toHaveBeenCalledWith(1, ADMIN_PAGE_SIZE);
  });

  it("clamps an absurdly large page param instead of passing it through raw", async () => {
    await MasterclassAdminStudentsPage({ searchParams: Promise.resolve({ page: "99999999999999" }) });
    const [calledPage] = listStudentsPageMock.mock.calls.at(-1)!;
    expect(calledPage).toBeLessThanOrEqual(100_000);
  });

  it("accepts a valid page number", async () => {
    await MasterclassAdminStudentsPage({ searchParams: Promise.resolve({ page: "3" }) });
    expect(listStudentsPageMock).toHaveBeenCalledWith(3, ADMIN_PAGE_SIZE);
  });

  it("shows an empty-state message when there are no students yet", async () => {
    listStudentsPageMock.mockResolvedValue({ students: [], totalCount: 0 });
    const element = await MasterclassAdminStudentsPage({ searchParams: Promise.resolve({}) });
    render(element);
    expect(screen.getByText("No students yet.")).toBeInTheDocument();
  });
});
