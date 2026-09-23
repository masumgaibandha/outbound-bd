// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// AgencyLeadForm calls `useRouter()` — real in the app's actual router
// context, but RTL renders outside of one, so it needs a stub.
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return { ...actual, useRouter: () => ({ push: vi.fn() }) };
});

import { AgencyLeadForm } from "@/components/agencies/agency-lead-form";
import { ContactForm } from "@/components/public/contact-form";

/**
 * Regression coverage for the honeypot-autofill incident: a prior field
 * name/label ("agency_phone"/"company_phone", labeled "Phone number") was
 * silently filled by Chrome's autofill for real visitors with a saved
 * phone number, dropping real paid-traffic leads with no visible error.
 * Both forms' honeypot fields must carry none of the attributes/wording
 * that make a field look like a contact field to browser autofill.
 */
const CONTACT_FIELD_WORDS = /phone|email|name|address|company|website/i;

function getHoneypotInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[tabindex="-1"]');
  if (!input) throw new Error("Honeypot input not found");
  return input as HTMLInputElement;
}

describe("AgencyLeadForm honeypot field", () => {
  it("has no autofill-triggering name, id, or label text", () => {
    const { container } = render(<AgencyLeadForm />);
    const input = getHoneypotInput(container);

    expect(input.name).not.toMatch(CONTACT_FIELD_WORDS);
    expect(input.id).not.toMatch(CONTACT_FIELD_WORDS);
    expect(input.autocomplete).toBe("new-password");
    expect(input.getAttribute("aria-hidden")).toBe("true");
    expect(input.tabIndex).toBe(-1);

    const label = container.querySelector(`label[for="${input.id}"]`);
    expect(label).not.toBeNull();
    expect(label?.textContent).not.toMatch(CONTACT_FIELD_WORDS);
    expect(label?.textContent).toBe("Leave this field empty");
  });

  it("is still present in the DOM for a simple bot to fill", () => {
    const { container } = render(<AgencyLeadForm />);
    expect(getHoneypotInput(container)).toBeInTheDocument();
  });
});

describe("ContactForm honeypot field", () => {
  it("has no autofill-triggering name, id, or label text", () => {
    const { container } = render(<ContactForm />);
    const input = getHoneypotInput(container);

    expect(input.name).not.toMatch(CONTACT_FIELD_WORDS);
    expect(input.id).not.toMatch(CONTACT_FIELD_WORDS);
    expect(input.autocomplete).toBe("new-password");
    expect(input.getAttribute("aria-hidden")).toBe("true");
    expect(input.tabIndex).toBe(-1);

    const label = container.querySelector(`label[for="${input.id}"]`);
    expect(label).not.toBeNull();
    expect(label?.textContent).not.toMatch(CONTACT_FIELD_WORDS);
    expect(label?.textContent).toBe("Leave this field empty");
  });

  it("is still present in the DOM for a simple bot to fill", () => {
    const { container } = render(<ContactForm />);
    expect(getHoneypotInput(container)).toBeInTheDocument();
  });
});

describe("AgencyLeadForm and ContactForm honeypot fields use the same neutral name", () => {
  it("both use hp_confirm, never a contact-sounding name", () => {
    const agency = render(<AgencyLeadForm />);
    const contact = render(<ContactForm />);

    expect(getHoneypotInput(agency.container).name).toBe("hp_confirm");
    expect(getHoneypotInput(contact.container).name).toBe("hp_confirm");
  });
});
