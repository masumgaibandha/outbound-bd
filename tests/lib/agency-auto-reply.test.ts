import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.hoisted(() => vi.fn());
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

import { sendAgencyAutoReply, type AgencyAutoReplyInput } from "@/lib/agency-auto-reply";

function validInput(overrides: Partial<AgencyAutoReplyInput> = {}): AgencyAutoReplyInput {
  return {
    inquiryId: "64f000000000000000000456",
    name: "Jordan Rivera",
    email: "jordan@agency.com",
    ...overrides,
  };
}

beforeEach(() => {
  sendMock.mockReset();
  sendMock.mockResolvedValue({ data: { id: "email_1" }, error: null });
  vi.unstubAllEnvs();
  vi.stubEnv("RESEND_API_KEY", "test-resend-key");
  vi.stubEnv("RESEND_FROM_EMAIL", "Outbound BD <notifications@updates.outboundbd.com>");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sendAgencyAutoReply — configuration sourcing", () => {
  it("sends to the lead's own email, from RESEND_FROM_EMAIL, reply-to RESEND_REPLY_TO_EMAIL", async () => {
    vi.stubEnv("RESEND_REPLY_TO_EMAIL", "masum@outboundbd.com");
    const result = await sendAgencyAutoReply(validInput());
    expect(result.ok).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(1);

    const [payload] = sendMock.mock.calls[0];
    expect(payload.to).toBe("jordan@agency.com");
    expect(payload.from).toBe("Outbound BD <notifications@updates.outboundbd.com>");
    expect(payload.replyTo).toBe("masum@outboundbd.com");
  });

  it("falls back to RESEND_FROM_EMAIL as reply-to when RESEND_REPLY_TO_EMAIL is unset", async () => {
    const result = await sendAgencyAutoReply(validInput());
    expect(result.ok).toBe(true);
    const [payload] = sendMock.mock.calls[0];
    expect(payload.replyTo).toBe("Outbound BD <notifications@updates.outboundbd.com>");
  });

  it("returns EMAIL_NOT_CONFIGURED and sends nothing when RESEND_API_KEY is unset", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const result = await sendAgencyAutoReply(validInput());
    expect(result).toEqual({ ok: false, errorCode: "EMAIL_NOT_CONFIGURED" });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("returns SENDER_NOT_CONFIGURED and sends nothing when RESEND_FROM_EMAIL is unset", async () => {
    vi.stubEnv("RESEND_FROM_EMAIL", "");
    const result = await sendAgencyAutoReply(validInput());
    expect(result).toEqual({ ok: false, errorCode: "SENDER_NOT_CONFIGURED" });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("importing this module never throws even with no email env configured at all", async () => {
    vi.unstubAllEnvs();
    await expect(import("@/lib/agency-auto-reply")).resolves.toBeTruthy();
  });
});

describe("sendAgencyAutoReply — exact copy", () => {
  it("uses the exact subject and body text, with the first name only (not the full name)", async () => {
    await sendAgencyAutoReply(validInput({ name: "Jordan Rivera" }));
    const [payload] = sendMock.mock.calls[0];

    expect(payload.subject).toBe("Got your details, Jordan");
    expect(payload.text).toBe(
      [
        "Hi Jordan,",
        "",
        "Thanks for reaching out about cold email for your agency.",
        "",
        "I'll look at your site and reply personally within one business day. If you'd rather talk it through sooner, you can book a time here:",
        "https://calendly.com/almasumbd/discovery-call",
        "",
        "Masum",
        "Outbound BD",
      ].join("\n"),
    );
    expect(payload.html).toContain("Hi Jordan,");
    expect(payload.html).toContain("Thanks for reaching out about cold email for your agency.");
    expect(payload.html).toContain("https://calendly.com/almasumbd/discovery-call");
    expect(payload.html).toContain("Masum");
  });

  it("escapes a visitor-controlled name so it cannot inject markup into the HTML body", async () => {
    await sendAgencyAutoReply(validInput({ name: "<img src=x onerror=alert(1)>" }));
    const [payload] = sendMock.mock.calls[0];
    expect(payload.html).not.toContain("<img src=x onerror=alert(1)>");
  });
});

describe("sendAgencyAutoReply — failure handling", () => {
  it("returns PROVIDER_ERROR when Resend reports an error", async () => {
    sendMock.mockResolvedValueOnce({ data: null, error: { message: "invalid request" } });
    const result = await sendAgencyAutoReply(validInput());
    expect(result).toEqual({ ok: false, errorCode: "PROVIDER_ERROR" });
  });

  it("returns NETWORK_ERROR when the Resend call throws, without throwing itself", async () => {
    sendMock.mockRejectedValueOnce(new Error("network down"));
    await expect(sendAgencyAutoReply(validInput())).resolves.toEqual({
      ok: false,
      errorCode: "NETWORK_ERROR",
    });
  });
});
