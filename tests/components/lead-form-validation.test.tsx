// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// AgencyLeadForm calls `useRouter()`; RTL renders outside a router.
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return { ...actual, useRouter: () => ({ push: vi.fn() }) };
});

import { AgencyLeadForm } from "@/components/agencies/agency-lead-form";
import { ContactForm } from "@/components/public/contact-form";

/**
 * Regression coverage for "submitting with the website empty fails
 * silently": a failed client-side validation must visibly mark the field,
 * show the message in the error tone, expose it to screen readers, and
 * scroll to and focus the first invalid field. Validation rules themselves
 * are covered by the schema tests and are not re-tested here.
 */
const FORMS: { name: string; element: () => ReactElement; submit: string; filled: string[] }[] = [
  { name: "ContactForm (/contact)", element: () => <ContactForm />, submit: "Send inquiry", filled: ["name", "email", "company"] },
  { name: "AgencyLeadForm (/agencies)", element: () => <AgencyLeadForm />, submit: "Send my details", filled: ["name", "email"] },
  {
    name: "AgencyLeadForm (/cold-email)",
    element: () => <AgencyLeadForm variant="cold-email" />,
    submit: "Send my details",
    filled: ["name", "email"],
  },
];

const VALUES: Record<string, string> = {
  name: "Test Person",
  email: "test@example.com",
  company: "Example Co",
};

const scrollIntoView = vi.fn();
const fetchSpy = vi.fn();

beforeEach(() => {
  scrollIntoView.mockReset();
  fetchSpy.mockReset();
  Element.prototype.scrollIntoView = scrollIntoView;
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function field(container: HTMLElement, id: string) {
  const element = container.querySelector<HTMLElement>(`#${id}`);
  if (!element) throw new Error(`Field #${id} not found`);
  return element;
}

describe.each(FORMS)("$name validation errors", ({ element, submit, filled }) => {
  it("marks an empty website as invalid, in the error tone, and focuses it", async () => {
    const user = userEvent.setup();
    const { container } = render(element());

    for (const id of filled) await user.type(field(container, id), VALUES[id]!);
    await user.click(screen.getByRole("button", { name: submit }));

    const website = field(container, "website");
    expect(website).toHaveAttribute("aria-invalid", "true");
    expect(website).toHaveAttribute("aria-describedby", "website-error");
    expect(website).toHaveClass("aria-[invalid=true]:border-error");

    const message = container.querySelector("#website-error");
    expect(message).not.toBeNull();
    expect(message).toHaveTextContent(/website/i);
    expect(message).toHaveClass("text-error");
    expect(message).not.toHaveClass("text-ink");
    expect(website).toHaveAccessibleDescription(message!.textContent!);

    expect(website).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(website);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("focuses the first invalid field in page order when everything is empty", async () => {
    const user = userEvent.setup();
    const { container } = render(element());

    await user.click(screen.getByRole("button", { name: submit }));

    expect(field(container, "name")).toHaveFocus();
    expect(field(container, "name")).toHaveAttribute("aria-invalid", "true");
    for (const message of container.querySelectorAll('[id$="-error"]')) {
      expect(message).toHaveClass("text-error");
    }
  });

  it("leaves valid fields unmarked", async () => {
    const user = userEvent.setup();
    const { container } = render(element());

    for (const id of filled) await user.type(field(container, id), VALUES[id]!);
    await user.click(screen.getByRole("button", { name: submit }));

    for (const id of filled) {
      expect(field(container, id)).toHaveAttribute("aria-invalid", "false");
      expect(field(container, id)).not.toHaveAttribute("aria-describedby");
    }
  });
});

describe("error color token", () => {
  it("is a distinct red, not the terracotta CTA color", async () => {
    const { readFileSync } = await import("node:fs");
    const css = readFileSync("src/app/globals.css", "utf8");
    const error = css.match(/--color-error:\s*(#[0-9a-f]{6})/i)?.[1];
    const action = css.match(/--color-action:\s*(#[0-9a-f]{6})/i)?.[1];
    expect(error).toBe("#a8202f");
    expect(error).not.toBe(action);
  });
});
