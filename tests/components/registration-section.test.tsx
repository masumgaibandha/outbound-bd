// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Registration } from "@/components/masterclass/Registration";
import { registration } from "@/data/masterclass-content";

const REAL_LOOKING_SECRET_KEY = "0x4AAAAAAA_real_looking_secret_key_value";
const REAL_LOOKING_SITE_KEY = "0x4AAAAAAA_real_looking_site_key_value";

function setOperationallyReadyEnv(overrides: Record<string, string | undefined> = {}) {
  const base: Record<string, string | undefined> = {
    TURNSTILE_SECRET_KEY: REAL_LOOKING_SECRET_KEY,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: REAL_LOOKING_SITE_KEY,
    MASTERCLASS_RATE_LIMIT_SECRET: "a-rotated-test-secret",
    MASTERCLASS_ALLOWED_ORIGINS: "https://outboundbd.com,https://www.outboundbd.com",
    MASTERCLASS_REGISTRATION_ENABLED: "true",
    ...overrides,
  };
  for (const [key, value] of Object.entries(base)) {
    if (value === undefined) vi.stubEnv(key, "");
    else vi.stubEnv(key, value);
  }
}

beforeEach(() => {
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Registration section gating", () => {
  it("enabled state: renders the interactive form when every readiness signal is present", () => {
    setOperationallyReadyEnv();
    render(<Registration priceBDT={1499} isEarlyBird={true} regularPriceBDT={1999} />);
    // The interactive form's step-1 fields are present (mounted, not the static disabled form).
    expect(screen.getByLabelText(registration.fields.name)).not.toBeDisabled();
    expect(screen.queryByText(registration.devNotice)).not.toBeInTheDocument();
  });

  it("disabled state: MASTERCLASS_REGISTRATION_ENABLED unset renders the closed notice and a disabled form", () => {
    setOperationallyReadyEnv({ MASTERCLASS_REGISTRATION_ENABLED: undefined });
    render(<Registration priceBDT={1499} isEarlyBird={false} regularPriceBDT={1999} />);

    expect(screen.getByText(registration.devNotice)).toBeInTheDocument();
    const submit = screen.getByRole("button", { name: registration.submitDisabledLabel });
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByLabelText(registration.fields.name)).toBeDisabled();
  });

  it("disabled state: missing Turnstile site key alone is enough to close registration", () => {
    setOperationallyReadyEnv({ NEXT_PUBLIC_TURNSTILE_SITE_KEY: undefined });
    render(<Registration priceBDT={1499} isEarlyBird={false} regularPriceBDT={1999} />);
    expect(screen.getByText(registration.devNotice)).toBeInTheDocument();
  });

  it("disabled state: incomplete security config (missing rate-limit secret) closes registration", () => {
    setOperationallyReadyEnv({ MASTERCLASS_RATE_LIMIT_SECRET: undefined });
    render(<Registration priceBDT={1499} isEarlyBird={false} regularPriceBDT={1999} />);
    expect(screen.getByText(registration.devNotice)).toBeInTheDocument();
  });

  it("disabled state: the static form cannot submit anything (no fetch pathway exists)", () => {
    setOperationallyReadyEnv({ MASTERCLASS_REGISTRATION_ENABLED: undefined });
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(<Registration priceBDT={1499} isEarlyBird={false} regularPriceBDT={1999} />);

    const submit = screen.getByRole("button", { name: registration.submitDisabledLabel });
    submit.click(); // native click; the button is `disabled` so no submit/click handler runs
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("never renders a server secret value regardless of env content", () => {
    setOperationallyReadyEnv();
    const { container } = render(<Registration priceBDT={1499} isEarlyBird={false} regularPriceBDT={1999} />);
    expect(container.innerHTML).not.toContain(REAL_LOOKING_SECRET_KEY);
    expect(container.innerHTML).not.toContain("a-rotated-test-secret");
  });
});
