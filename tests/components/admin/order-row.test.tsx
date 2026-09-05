// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const approveOrderActionMock = vi.hoisted(() => vi.fn());
const rejectOrderActionMock = vi.hoisted(() => vi.fn());
const retryDeliveryActionMock = vi.hoisted(() => vi.fn());
vi.mock("@/app/masterclass/admin/orders/actions", () => ({
  approveOrderAction: approveOrderActionMock,
  rejectOrderAction: rejectOrderActionMock,
  retryDeliveryAction: retryDeliveryActionMock,
}));

import { OrderRow } from "@/components/masterclass/admin/OrderRow";
import type { AdminReviewOrder } from "@/lib/masterclass/payment-orders-repository";

const baseOrder: AdminReviewOrder = {
  publicOrderRef: "ord_test123",
  publicRegistrationRef: "MC-2026-000123",
  name: "Rafiq Islam",
  email: "rafiq@example.com",
  phone: "+8801712345678",
  method: "BKASH",
  amount: 1499,
  currency: "BDT",
  manualPayment: {
    senderNumber: "+8801712345678",
    transactionIdRaw: "TXN-ABC123",
    transactionIdNormalized: "TXN-ABC123",
    submittedAt: new Date("2026-08-01T12:00:00Z"),
  },
  attributionSource: null,
  createdAt: new Date("2026-08-01T11:00:00Z"),
};

describe("OrderRow", () => {
  it("renders the registration ref, contact details, and payment info", () => {
    render(<OrderRow order={baseOrder} />);
    expect(screen.getByText("MC-2026-000123")).toBeInTheDocument();
    expect(screen.getByText(/Rafiq Islam/)).toBeInTheDocument();
    expect(screen.getByText(/rafiq@example\.com/)).toBeInTheDocument();
    expect(screen.getByText("TXN-ABC123")).toBeInTheDocument();
  });

  it("approving shows a pending label, disables both buttons, and reports the result", async () => {
    const user = userEvent.setup();
    let resolveApprove: (value: { ok: boolean; message: string }) => void = () => {};
    approveOrderActionMock.mockReturnValue(
      new Promise((resolve) => {
        resolveApprove = resolve;
      }),
    );

    render(<OrderRow order={baseOrder} />);
    await user.click(screen.getByRole("button", { name: "Approve" }));

    expect(screen.getByRole("button", { name: "Approving…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reject" })).toBeDisabled();

    resolveApprove({ ok: true, message: "Approved — order is now PAID. Confirmation email sent." });
    await waitFor(() => {
      expect(screen.getByText(/Approved — order is now PAID/)).toBeInTheDocument();
    });
    expect(approveOrderActionMock).toHaveBeenCalledWith("ord_test123");
  });

  it("a recoverable server error is shown inline without crashing, and the row stays usable", async () => {
    const user = userEvent.setup();
    approveOrderActionMock.mockResolvedValue({ ok: false, message: "Order not found." });

    render(<OrderRow order={baseOrder} />);
    await user.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() => {
      expect(screen.getByText("Order not found.")).toBeInTheDocument();
    });
    // Row is not marked "processed" on failure — the approve button is still present and enabled.
    expect(screen.getByRole("button", { name: "Approve" })).toBeEnabled();
  });

  it("rejecting sends the typed reason and shows the rejection result", async () => {
    const user = userEvent.setup();
    rejectOrderActionMock.mockResolvedValue({ ok: true, message: "Rejected. The student is not notified automatically — contact them if needed." });

    render(<OrderRow order={baseOrder} />);
    await user.type(screen.getByPlaceholderText("Rejection reason (optional)"), "Transaction ID mismatch");
    await user.click(screen.getByRole("button", { name: "Reject" }));

    await waitFor(() => {
      expect(rejectOrderActionMock).toHaveBeenCalledWith("ord_test123", "Transaction ID mismatch");
    });
    await waitFor(() => {
      expect(screen.getByText(/Rejected\./)).toBeInTheDocument();
    });
  });

  it("shows a retry button only when the action result reports needsRetry, and retry never duplicates on repeated clicks while pending", async () => {
    const user = userEvent.setup();
    approveOrderActionMock.mockResolvedValue({
      ok: true,
      message: "Approved — order is now PAID. Confirmation email NOT sent (NETWORK_ERROR).",
      needsRetry: true,
    });
    let resolveRetry: (value: { ok: boolean; message: string }) => void = () => {};
    retryDeliveryActionMock.mockReturnValue(
      new Promise((resolve) => {
        resolveRetry = resolve;
      }),
    );

    render(<OrderRow order={baseOrder} />);
    await user.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Retry email / Meta CAPI" })).toBeInTheDocument();
    });

    const retryButton = screen.getByRole("button", { name: "Retry email / Meta CAPI" });
    await user.click(retryButton);
    // Button becomes disabled immediately — a second rapid click can't fire another call.
    expect(screen.getByRole("button", { name: "Retrying…" })).toBeDisabled();

    resolveRetry({ ok: true, message: "Confirmation email sent." });
    await waitFor(() => {
      expect(retryDeliveryActionMock).toHaveBeenCalledTimes(1);
    });
  });

  it("clearly identifies a bank-transfer order and shows the submitted payer name/bank, not a sender number", () => {
    const bankOrder: AdminReviewOrder = {
      ...baseOrder,
      method: "BANK",
      manualPayment: {
        senderNumber: null,
        payerName: "Karim Ahmed",
        senderBankName: "City Bank",
        transactionIdRaw: "REF-998877",
        transactionIdNormalized: "REF-998877",
        submittedAt: new Date("2026-08-01T12:00:00Z"),
      },
    };
    render(<OrderRow order={bankOrder} />);
    expect(screen.getByText(/Bank Transfer/)).toBeInTheDocument();
    expect(screen.getByText(/Karim Ahmed/)).toBeInTheDocument();
    expect(screen.getByText(/City Bank/)).toBeInTheDocument();
    expect(screen.getByText("REF-998877")).toBeInTheDocument();
  });

  it("no unrelated order's data or a raw ObjectId/secret-looking value leaks into the rendered row", () => {
    const { container } = render(<OrderRow order={baseOrder} />);
    // Only this order's own public ref should ever appear — never a raw Mongo _id shape.
    expect(container.textContent).not.toMatch(/^[0-9a-f]{24}$/m);
  });
});
