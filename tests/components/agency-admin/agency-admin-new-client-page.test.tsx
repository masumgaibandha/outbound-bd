// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// `CreateClientForm` calls `useRouter()` — real in the app's actual router
// context, but RTL renders outside of one, so it needs a stub.
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return { ...actual, useRouter: () => ({ push: vi.fn() }) };
});

import NewClientPage from "@/app/admin/clients/new/page";

describe("NewClientPage", () => {
  it("renders the create-client form with no prefilled values (a standalone client, no source lead)", () => {
    render(<NewClientPage />);

    expect(screen.getByText("Add client")).toBeInTheDocument();
    const nameInput = screen.getByRole("textbox", { name: /^Name$/ }) as HTMLInputElement;
    expect(nameInput.value).toBe("");
    expect(screen.getByText("Create client")).toBeInTheDocument();
  });
});
