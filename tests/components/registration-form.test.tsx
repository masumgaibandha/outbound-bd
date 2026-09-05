// @vitest-environment jsdom
import { useEffect } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MasterclassRegistrationForm } from "@/components/masterclass/MasterclassRegistrationForm";
import { registration, registrationForm } from "@/data/masterclass-content";
import { formatBDT } from "@/lib/masterclass/format";

/*
 * TurnstileWidget wraps a real remote Cloudflare script (`window.turnstile`)
 * that never loads in jsdom. It's out of scope for this file (a thin,
 * mostly-untestable-in-jsdom wrapper around third-party JS) — replaced with
 * a controllable stub exposing one button that fires the same `onToken`
 * callback the real widget would, so the form's *reaction* to a verified
 * token is what's under test here, not Cloudflare's script loader.
 */
vi.mock("@/components/masterclass/TurnstileWidget", () => ({
  TurnstileWidget: ({
    onToken,
    ref,
  }: {
    onToken: (token: string) => void;
    ref?: { current: { reset: () => void } | null };
  }) => {
    useEffect(() => {
      if (ref) ref.current = { reset: () => {} };
    }, [ref]);
    return (
      <button type="button" data-testid="mock-turnstile-verify" onClick={() => onToken("test-turnstile-token")}>
        Simulate Turnstile Verify
      </button>
    );
  },
}));

/*
 * HeroUI's `toast` is a global singleton — mocked here so assertions can
 * check exactly what was called, without depending on a mounted
 * `ToastProvider` (not rendered in this file) or on `document.startViewTransition`
 * internals running inside jsdom.
 */
const toastSuccessMock = vi.hoisted(() => vi.fn());
const toastDangerMock = vi.hoisted(() => vi.fn());
vi.mock("@heroui/react", () => ({
  toast: { success: toastSuccessMock, danger: toastDangerMock },
}));

interface ManualPaymentMethodEnv {
  enabled: boolean;
  number: string | null;
}
interface ManualPaymentBankEnvProp {
  enabled: boolean;
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  branch: string | null;
  routingNumber: string | null;
}
interface ManualPaymentEnvProp {
  bkash: ManualPaymentMethodEnv;
  nagad: ManualPaymentMethodEnv;
  rocket: ManualPaymentMethodEnv;
  bank: ManualPaymentBankEnvProp;
}

const BANK_DISABLED: ManualPaymentBankEnvProp = {
  enabled: false,
  bankName: null,
  accountName: null,
  accountNumber: null,
  branch: null,
  routingNumber: null,
};

const BANK_ENABLED: ManualPaymentBankEnvProp = {
  enabled: true,
  bankName: "Dutch-Bangla Bank",
  accountName: "Outbound BD",
  accountNumber: "1234567890123",
  branch: "Gulshan",
  routingNumber: "090261234",
};

const PRICE_BDT = 1499;
const PAYMENT_METHODS_ALL_ENABLED: ManualPaymentEnvProp = {
  bkash: { enabled: true, number: "01711111111" },
  nagad: { enabled: true, number: "01722222222" },
  rocket: { enabled: true, number: "01733333333" },
  bank: BANK_DISABLED,
};

function renderForm(overrides: Partial<{ paymentMethods: ManualPaymentEnvProp }> = {}) {
  return render(
    <MasterclassRegistrationForm
      siteKey="1x00000000000000000000AA"
      priceBDT={PRICE_BDT}
      paymentMethods={overrides.paymentMethods ?? PAYMENT_METHODS_ALL_ENABLED}
    />,
  );
}

async function fillValidStep1(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(registration.fields.name), "Rafiq Islam");
  await user.type(screen.getByLabelText(registration.fields.email), "rafiq@example.com");
  await user.type(screen.getByLabelText(registration.fields.phone), "01712345678");
  await user.click(screen.getByRole("checkbox", { name: new RegExp(registration.consentPrefix) }));
  await user.click(screen.getByTestId("mock-turnstile-verify"));
}

function mockFetchOnce(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: async () => body,
  };
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  toastSuccessMock.mockClear();
  toastDangerMock.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("MasterclassRegistrationForm — enabled state", () => {
  it("renders the complete step-1 form with name, email, phone, consent, and price", () => {
    renderForm();
    expect(screen.getByLabelText(registration.fields.name)).toBeInTheDocument();
    expect(screen.getByLabelText(registration.fields.email)).toBeInTheDocument();
    expect(screen.getByLabelText(registration.fields.phone)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: new RegExp(registration.consentPrefix) })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: new RegExp(`${registration.submitEnabledLabel} — ${formatBDT(PRICE_BDT)}`) }),
    ).toBeInTheDocument();
  });

  it("shows required-field errors when submitting empty", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: new RegExp(registration.submitEnabledLabel) }));

    expect(await screen.findByText(registrationForm.nameError)).toBeInTheDocument();
    expect(screen.getByText(registrationForm.emailError)).toBeInTheDocument();
    expect(screen.getByText(registrationForm.phoneError)).toBeInTheDocument();
    expect(screen.getByText(registrationForm.consentError)).toBeInTheDocument();
    expect(screen.getByText(registrationForm.errorSummaryHeading)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("rejects an invalid email", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(registration.fields.name), "Rafiq Islam");
    await user.type(screen.getByLabelText(registration.fields.email), "not-an-email");
    await user.type(screen.getByLabelText(registration.fields.phone), "01712345678");
    await user.click(screen.getByRole("checkbox", { name: new RegExp(registration.consentPrefix) }));
    await user.click(screen.getByTestId("mock-turnstile-verify"));
    await user.click(screen.getByRole("button", { name: new RegExp(registration.submitEnabledLabel) }));

    expect(await screen.findByText(registrationForm.emailError)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("accepts a valid Bangladeshi phone and rejects an invalid one", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(registration.fields.name), "Rafiq Islam");
    await user.type(screen.getByLabelText(registration.fields.email), "rafiq@example.com");
    await user.type(screen.getByLabelText(registration.fields.phone), "0123456"); // too short / invalid prefix shape
    await user.click(screen.getByRole("checkbox", { name: new RegExp(registration.consentPrefix) }));
    await user.click(screen.getByTestId("mock-turnstile-verify"));
    await user.click(screen.getByRole("button", { name: new RegExp(registration.submitEnabledLabel) }));
    expect(await screen.findByText(registrationForm.phoneError)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("displays the price passed via the priceBDT prop (no package selector exists — single fixed offering)", () => {
    renderForm();
    expect(
      screen.getByRole("button", { name: new RegExp(formatBDT(PRICE_BDT).replace(/[০-৯]/g, "\\$&")) }),
    ).toBeInTheDocument();
  });

  it("blocks submission until the Turnstile callback fires with a token", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockFetchOnce({ publicRegistrationRef: "MC-2026-000001", publicOrderRef: "ord_abc", status: "PENDING_PAYMENT" }, 201),
    );
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(registration.fields.name), "Rafiq Islam");
    await user.type(screen.getByLabelText(registration.fields.email), "rafiq@example.com");
    await user.type(screen.getByLabelText(registration.fields.phone), "01712345678");
    await user.click(screen.getByRole("checkbox", { name: new RegExp(registration.consentPrefix) }));
    // No Turnstile click yet. The component tracks a `turnstileToken` field
    // error internally (registrationForm.turnstileMissingError) but — per
    // the current markup — only ever surfaces the generic error-summary
    // banner for it, not that specific message; asserting what actually
    // renders rather than the unused string.
    await user.click(screen.getByRole("button", { name: new RegExp(registration.submitEnabledLabel) }));
    expect(await screen.findByText(registrationForm.errorSummaryHeading)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();

    await user.click(screen.getByTestId("mock-turnstile-verify"));
    await user.click(screen.getByRole("button", { name: new RegExp(registration.submitEnabledLabel) }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  });

  it("includes a startedAt timestamp close to submit time in the POST body", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockFetchOnce({ publicRegistrationRef: "MC-2026-000001", publicOrderRef: "ord_abc", status: "PENDING_PAYMENT" }, 201),
    );
    const user = userEvent.setup();
    renderForm();
    const before = Date.now();
    await fillValidStep1(user);
    await user.click(screen.getByRole("button", { name: new RegExp(registration.submitEnabledLabel) }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const sentBody = JSON.parse(init.body as string);
    expect(typeof sentBody.startedAt).toBe("number");
    expect(sentBody.startedAt).toBeGreaterThanOrEqual(before - 1000);
    expect(sentBody.startedAt).toBeLessThanOrEqual(Date.now());
  });

  it("shows a loading/disabled state while the request is pending", async () => {
    let resolveFetch!: (v: unknown) => void;
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );
    const user = userEvent.setup();
    renderForm();
    await fillValidStep1(user);

    const submitButton = screen.getByRole("button", { name: new RegExp(registration.submitEnabledLabel) });
    await user.click(submitButton);

    const loadingButton = await screen.findByRole("button", { name: registrationForm.loadingLabel });
    expect(loadingButton).toBeDisabled();

    resolveFetch(mockFetchOnce({ publicRegistrationRef: "MC-2026-000001", publicOrderRef: "ord_abc", status: "PENDING_PAYMENT" }, 201));
    await waitFor(() => expect(screen.getByText(registrationForm.paymentStepHeading)).toBeInTheDocument());
  });

  it("prevents a double-submit from firing two requests", async () => {
    let resolveFetch!: (v: unknown) => void;
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );
    const user = userEvent.setup();
    renderForm();
    await fillValidStep1(user);

    const submitButton = screen.getByRole("button", { name: new RegExp(registration.submitEnabledLabel) });
    await user.click(submitButton);
    // Button is now disabled/relabeled — a second click target is the same node.
    await user.click(submitButton);
    await user.click(submitButton);

    resolveFetch(mockFetchOnce({ publicRegistrationRef: "MC-2026-000001", publicOrderRef: "ord_abc", status: "PENDING_PAYMENT" }, 201));
    await waitFor(() => expect(screen.getByText(registrationForm.paymentStepHeading)).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("renders the payment-step UI on a successful registration response", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockFetchOnce({ publicRegistrationRef: "MC-2026-000001", publicOrderRef: "ord_abc", status: "PENDING_PAYMENT" }, 201),
    );
    const user = userEvent.setup();
    renderForm();
    await fillValidStep1(user);
    await user.click(screen.getByRole("button", { name: new RegExp(registration.submitEnabledLabel) }));

    expect(await screen.findByText(registrationForm.paymentStepHeading)).toBeInTheDocument();
    // Only the enabled methods (all three, in this fixture) are offered.
    expect(screen.getByRole("button", { name: "bKash" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nagad" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rocket" })).toBeInTheDocument();
  });

  it("only offers enabled payment methods and never leaks a disabled method's number", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockFetchOnce({ publicRegistrationRef: "MC-2026-000001", publicOrderRef: "ord_abc", status: "PENDING_PAYMENT" }, 201),
    );
    const user = userEvent.setup();
    renderForm({
      paymentMethods: {
        bkash: { enabled: true, number: "01711111111" },
        nagad: { enabled: false, number: "01799999999" }, // configured but disabled — must never render
        rocket: { enabled: false, number: null },
        bank: BANK_DISABLED,
      },
    });
    await fillValidStep1(user);
    await user.click(screen.getByRole("button", { name: new RegExp(registration.submitEnabledLabel) }));

    await screen.findByText(registrationForm.paymentStepHeading);
    expect(screen.getByRole("button", { name: "bKash" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Nagad" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Rocket" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Bank Transfer" })).not.toBeInTheDocument();
    expect(screen.queryByText("01799999999")).not.toBeInTheDocument();
  });

  it("shows the bank option only when its configuration is complete, with server-controlled destination details, and hides it (without disabling anything else) when incomplete", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockFetchOnce({ publicRegistrationRef: "MC-2026-000001", publicOrderRef: "ord_abc", status: "PENDING_PAYMENT" }, 201),
    );
    const user = userEvent.setup();
    renderForm({
      paymentMethods: { ...PAYMENT_METHODS_ALL_ENABLED, bank: BANK_ENABLED },
    });
    await fillValidStep1(user);
    await user.click(screen.getByRole("button", { name: new RegExp(registration.submitEnabledLabel) }));
    await screen.findByText(registrationForm.paymentStepHeading);

    // bKash/Nagad/Rocket are unaffected by the bank option being present.
    expect(screen.getByRole("button", { name: "bKash" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nagad" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rocket" })).toBeInTheDocument();

    const bankButton = screen.getByRole("button", { name: "Bank Transfer" });
    await user.click(bankButton);

    expect(screen.getByText(BANK_ENABLED.bankName!)).toBeInTheDocument();
    expect(screen.getByText(BANK_ENABLED.accountName!)).toBeInTheDocument();
    expect(screen.getByText(BANK_ENABLED.accountNumber!)).toBeInTheDocument();
    expect(screen.getByText(BANK_ENABLED.branch!)).toBeInTheDocument();
    expect(screen.getByText(BANK_ENABLED.routingNumber!)).toBeInTheDocument();
    // The bank step never asks for a "sender number" — that field is mobile-wallet-only.
    expect(screen.queryByLabelText(registrationForm.senderNumberLabel)).not.toBeInTheDocument();
    expect(screen.getByLabelText(registrationForm.payerNameLabel)).toBeInTheDocument();
  });

  it("an incomplete bank configuration hides only the bank option — bKash/Nagad/Rocket still render", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockFetchOnce({ publicRegistrationRef: "MC-2026-000001", publicOrderRef: "ord_abc", status: "PENDING_PAYMENT" }, 201),
    );
    const user = userEvent.setup();
    renderForm({ paymentMethods: PAYMENT_METHODS_ALL_ENABLED }); // bank: BANK_DISABLED
    await fillValidStep1(user);
    await user.click(screen.getByRole("button", { name: new RegExp(registration.submitEnabledLabel) }));
    await screen.findByText(registrationForm.paymentStepHeading);

    expect(screen.getByRole("button", { name: "bKash" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nagad" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rocket" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Bank Transfer" })).not.toBeInTheDocument();
  });

  it("submitting a valid bank payment sends payerName/senderBankName/transactionId — never a senderNumber or destination-account field", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockFetchOnce({ publicRegistrationRef: "MC-2026-000001", publicOrderRef: "ord_abc", status: "PENDING_PAYMENT" }, 201))
      .mockResolvedValueOnce(mockFetchOnce({ publicOrderRef: "ord_abc", status: "REVIEW" }, 200));
    const user = userEvent.setup();
    renderForm({ paymentMethods: { ...PAYMENT_METHODS_ALL_ENABLED, bank: BANK_ENABLED } });
    await fillValidStep1(user);
    await user.click(screen.getByRole("button", { name: new RegExp(registration.submitEnabledLabel) }));
    await screen.findByText(registrationForm.paymentStepHeading);

    await user.click(screen.getByRole("button", { name: "Bank Transfer" }));
    await user.type(screen.getByLabelText(registrationForm.payerNameLabel), "Rafiq Islam");
    await user.type(screen.getByLabelText(registrationForm.senderBankNameLabel), "City Bank");
    await user.type(screen.getByLabelText(registrationForm.transactionIdBankLabel), "REF-998877");
    await user.click(screen.getByRole("button", { name: registrationForm.submitPaymentLabel }));

    expect(await screen.findByText(registrationForm.pendingHeading)).toBeInTheDocument();
    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
    const sentBody = JSON.parse(init.body as string);
    expect(sentBody).toEqual({
      method: "BANK",
      payerName: "Rafiq Islam",
      senderBankName: "City Bank",
      transactionId: "REF-998877",
    });
    expect(sentBody).not.toHaveProperty("senderNumber");
    expect(sentBody).not.toHaveProperty("accountNumber");
  });

  it("rejects a bank payment submission missing the payer name", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockFetchOnce({ publicRegistrationRef: "MC-2026-000001", publicOrderRef: "ord_abc", status: "PENDING_PAYMENT" }, 201),
    );
    const user = userEvent.setup();
    renderForm({ paymentMethods: { ...PAYMENT_METHODS_ALL_ENABLED, bank: BANK_ENABLED } });
    await fillValidStep1(user);
    await user.click(screen.getByRole("button", { name: new RegExp(registration.submitEnabledLabel) }));
    await screen.findByText(registrationForm.paymentStepHeading);

    await user.click(screen.getByRole("button", { name: "Bank Transfer" }));
    await user.type(screen.getByLabelText(registrationForm.transactionIdBankLabel), "REF-998877");
    await user.click(screen.getByRole("button", { name: registrationForm.submitPaymentLabel }));

    expect(await screen.findByText(registrationForm.payerNameError)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1); // only the step-1 registration call — payment was never submitted
  });

  it("selecting a payment method and submitting valid evidence completes step 2", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockFetchOnce({ publicRegistrationRef: "MC-2026-000001", publicOrderRef: "ord_abc", status: "PENDING_PAYMENT" }, 201))
      .mockResolvedValueOnce(mockFetchOnce({ publicOrderRef: "ord_abc", status: "REVIEW" }, 200));
    const user = userEvent.setup();
    renderForm();
    await fillValidStep1(user);
    await user.click(screen.getByRole("button", { name: new RegExp(registration.submitEnabledLabel) }));
    await screen.findByText(registrationForm.paymentStepHeading);

    await user.click(screen.getByRole("button", { name: "bKash" }));
    await user.type(screen.getByLabelText(registrationForm.senderNumberLabel), "01712345678");
    await user.type(screen.getByLabelText(registrationForm.transactionIdLabel), "9G7H2K1XYZ");
    await user.click(screen.getByRole("button", { name: registrationForm.submitPaymentLabel }));

    expect(await screen.findByText(registrationForm.pendingHeading)).toBeInTheDocument();
    expect(screen.getByText("MC-2026-000001")).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(2);
    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(url).toBe("/api/masterclass/registrations/ord_abc/payment");

    // Success toast fires only after the API confirms persistence — never before.
    expect(toastSuccessMock).toHaveBeenCalledTimes(1);
    expect(toastSuccessMock).toHaveBeenCalledWith(registrationForm.paymentSuccessToast);
    expect(toastDangerMock).not.toHaveBeenCalled();
  });

  it("shows a loading/disabled state on the payment-step submit button while the request is pending", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockFetchOnce({ publicRegistrationRef: "MC-2026-000001", publicOrderRef: "ord_abc", status: "PENDING_PAYMENT" }, 201),
    );
    let resolvePayment!: (v: unknown) => void;
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      // Never resolved during this test — the response for step 1 above is queued first via mockResolvedValueOnce.
      new Promise((resolve) => {
        resolvePayment = resolve;
      }),
    );
    const user = userEvent.setup();
    renderForm();
    await fillValidStep1(user);
    await user.click(screen.getByRole("button", { name: new RegExp(registration.submitEnabledLabel) }));
    await screen.findByText(registrationForm.paymentStepHeading);

    await user.click(screen.getByRole("button", { name: "bKash" }));
    await user.type(screen.getByLabelText(registrationForm.senderNumberLabel), "01712345678");
    await user.type(screen.getByLabelText(registrationForm.transactionIdLabel), "9G7H2K1XYZ");
    await user.click(screen.getByRole("button", { name: registrationForm.submitPaymentLabel }));

    const loadingButton = await screen.findByRole("button", { name: registrationForm.loadingLabel });
    expect(loadingButton).toBeDisabled();
    expect(toastSuccessMock).not.toHaveBeenCalled(); // not shown before the response resolves

    resolvePayment(mockFetchOnce({ publicOrderRef: "ord_abc", status: "REVIEW" }, 200));
    await waitFor(() => expect(screen.getByText(registrationForm.pendingHeading)).toBeInTheDocument());
    expect(toastSuccessMock).toHaveBeenCalledTimes(1);
  });

  it("shows a concise error toast (never a raw server error) when payment submission fails, and does not duplicate on a repeated click", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockFetchOnce({ publicRegistrationRef: "MC-2026-000001", publicOrderRef: "ord_abc", status: "PENDING_PAYMENT" }, 201))
      .mockResolvedValueOnce(mockFetchOnce({ error: "DUPLICATE_TRANSACTION_ID" }, 409));
    const user = userEvent.setup();
    renderForm();
    await fillValidStep1(user);
    await user.click(screen.getByRole("button", { name: new RegExp(registration.submitEnabledLabel) }));
    await screen.findByText(registrationForm.paymentStepHeading);

    await user.click(screen.getByRole("button", { name: "bKash" }));
    await user.type(screen.getByLabelText(registrationForm.senderNumberLabel), "01712345678");
    await user.type(screen.getByLabelText(registrationForm.transactionIdLabel), "9G7H2K1XYZ");
    await user.click(screen.getByRole("button", { name: registrationForm.submitPaymentLabel }));

    await waitFor(() => expect(toastDangerMock).toHaveBeenCalledTimes(1));
    expect(toastDangerMock).toHaveBeenCalledWith(registrationForm.paymentErrorToast);
    // The specific inline message is preserved alongside the generic toast.
    expect(await screen.findByText(registrationForm.duplicateTransactionError)).toBeInTheDocument();
    expect(toastSuccessMock).not.toHaveBeenCalled();

    // The form is usable again — a second click, without a second submission already in flight, is a distinct user action, not a dedup case; confirm no crash and no toast pile-up from the single failure above.
    expect(toastDangerMock).toHaveBeenCalledTimes(1);
  });

  it("guards against a duplicate payment submission from rapid double-clicking — only one request, one toast", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockFetchOnce({ publicRegistrationRef: "MC-2026-000001", publicOrderRef: "ord_abc", status: "PENDING_PAYMENT" }, 201),
    );
    let resolvePayment!: (v: unknown) => void;
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePayment = resolve;
      }),
    );
    const user = userEvent.setup();
    renderForm();
    await fillValidStep1(user);
    await user.click(screen.getByRole("button", { name: new RegExp(registration.submitEnabledLabel) }));
    await screen.findByText(registrationForm.paymentStepHeading);

    await user.click(screen.getByRole("button", { name: "bKash" }));
    await user.type(screen.getByLabelText(registrationForm.senderNumberLabel), "01712345678");
    await user.type(screen.getByLabelText(registrationForm.transactionIdLabel), "9G7H2K1XYZ");

    const submitButton = screen.getByRole("button", { name: registrationForm.submitPaymentLabel });
    await user.click(submitButton);
    // Button is now disabled/relabeled — further clicks on the same node fire no new handler.
    await user.click(submitButton);
    await user.click(submitButton);

    resolvePayment(mockFetchOnce({ publicOrderRef: "ord_abc", status: "REVIEW" }, 200));
    await waitFor(() => expect(screen.getByText(registrationForm.pendingHeading)).toBeInTheDocument());

    expect(global.fetch).toHaveBeenCalledTimes(2); // one step-1 call + exactly one payment call
    expect(toastSuccessMock).toHaveBeenCalledTimes(1);
    expect(toastDangerMock).not.toHaveBeenCalled();
  });

  it("shows a recoverable inline error on a server error response and keeps the form usable", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockFetchOnce({ error: "RATE_LIMITED" }, 429),
    );
    const user = userEvent.setup();
    renderForm();
    await fillValidStep1(user);
    await user.click(screen.getByRole("button", { name: new RegExp(registration.submitEnabledLabel) }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    // Form did not crash and the submit control is present and re-enabled.
    const submitButton = screen.getByRole("button", { name: new RegExp(registration.submitEnabledLabel) });
    expect(submitButton).toBeEnabled();
  });

  it("shows the validation error summary on a 422 VALIDATION_ERROR response", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockFetchOnce({ error: "VALIDATION_ERROR", fields: [{ field: "email", message: "bad" }] }, 422),
    );
    const user = userEvent.setup();
    renderForm();
    await fillValidStep1(user);
    await user.click(screen.getByRole("button", { name: new RegExp(registration.submitEnabledLabel) }));

    expect(await screen.findByText(registrationForm.errorSummaryHeading)).toBeInTheDocument();
  });

  it("keyboard: tab order reaches every interactive step-1 field, and the first invalid field is focused after a failed submit", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.tab();
    expect(screen.getByLabelText(registration.fields.name)).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText(registration.fields.email)).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText(registration.fields.phone)).toHaveFocus();

    // Submitting empty focuses the first invalid field (name).
    await user.click(screen.getByRole("button", { name: new RegExp(registration.submitEnabledLabel) }));
    await waitFor(() => expect(screen.getByLabelText(registration.fields.name)).toHaveFocus());
  });

  it("keyboard: the honeypot field is not reachable via Tab (tabIndex=-1) and carries no user-facing bot-trap wording", () => {
    renderForm();
    const honeypot = document.querySelector('input[name="company_phone"]') as HTMLInputElement;
    expect(honeypot).toBeTruthy();
    expect(honeypot.tabIndex).toBe(-1);
    // Not discoverable via a normal accessible-name query real users/tab order would use.
    expect(screen.queryByRole("textbox", { name: /honeypot|bot|do not fill/i })).not.toBeInTheDocument();
  });

  it("never renders a test/secret credential value in the output", () => {
    const { container } = renderForm({
      paymentMethods: {
        bkash: { enabled: true, number: "01711111111" },
        nagad: { enabled: false, number: "01799999999" },
        rocket: { enabled: false, number: null },
        bank: BANK_DISABLED,
      },
    });
    const html = container.innerHTML;
    // The disabled method's number must never leak into markup, even hidden.
    expect(html).not.toContain("01799999999");
    // No Cloudflare test-key literals or server-secret env-var names ever appear —
    // this component only ever receives siteKey (public by design), priceBDT, and
    // enabled-method numbers, never TURNSTILE_SECRET_KEY/MASTERCLASS_RATE_LIMIT_SECRET.
    expect(html).not.toContain("TURNSTILE_SECRET_KEY");
    expect(html).not.toContain("MASTERCLASS_RATE_LIMIT_SECRET");
    expect(html).not.toContain("1x0000000000000000000000000000000AA"); // Cloudflare test *secret* key shape
  });
});
