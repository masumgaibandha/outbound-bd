import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.hoisted(() => vi.fn());
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

import { sendAgencyAutoReply, type AgencyAutoReplyInput } from "@/lib/agency-auto-reply";

const DEFAULT_FROM = "Masum from Outbound BD <masum@updates.outboundbd.com>";

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
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sendAgencyAutoReply — configuration sourcing", () => {
  it("sends to the lead's own email, from the default AGENCY_AUTOREPLY_FROM address, reply-to RESEND_REPLY_TO_EMAIL", async () => {
    vi.stubEnv("RESEND_REPLY_TO_EMAIL", "masum@outboundbd.com");
    const result = await sendAgencyAutoReply(validInput());
    expect(result.ok).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(1);

    const [payload] = sendMock.mock.calls[0];
    expect(payload.to).toBe("jordan@agency.com");
    expect(payload.from).toBe(DEFAULT_FROM);
    expect(payload.replyTo).toBe("masum@outboundbd.com");
  });

  it("uses AGENCY_AUTOREPLY_FROM when set, instead of the default", async () => {
    vi.stubEnv("AGENCY_AUTOREPLY_FROM", "Masum <masum@othersender.example>");
    const result = await sendAgencyAutoReply(validInput());
    expect(result.ok).toBe(true);
    const [payload] = sendMock.mock.calls[0];
    expect(payload.from).toBe("Masum <masum@othersender.example>");
  });

  it("is independent of RESEND_FROM_EMAIL — that var is never read for this email", async () => {
    vi.stubEnv("RESEND_FROM_EMAIL", "Outbound BD <notifications@updates.outboundbd.com>");
    const result = await sendAgencyAutoReply(validInput());
    expect(result.ok).toBe(true);
    const [payload] = sendMock.mock.calls[0];
    expect(payload.from).toBe(DEFAULT_FROM);
  });

  it("falls back to its own from-address as reply-to when RESEND_REPLY_TO_EMAIL is unset", async () => {
    const result = await sendAgencyAutoReply(validInput());
    expect(result.ok).toBe(true);
    const [payload] = sendMock.mock.calls[0];
    expect(payload.replyTo).toBe(DEFAULT_FROM);
  });

  it("returns EMAIL_NOT_CONFIGURED and sends nothing when RESEND_API_KEY is unset", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const result = await sendAgencyAutoReply(validInput());
    expect(result).toEqual({ ok: false, errorCode: "EMAIL_NOT_CONFIGURED" });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("still sends successfully with no other email env configured at all — the from-address always has a working default", async () => {
    const result = await sendAgencyAutoReply(validInput());
    expect(result.ok).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("importing this module never throws even with no email env configured at all", async () => {
    vi.unstubAllEnvs();
    await expect(import("@/lib/agency-auto-reply")).resolves.toBeTruthy();
  });
});

describe("sendAgencyAutoReply — plain text only", () => {
  it("sends no html part at all", async () => {
    await sendAgencyAutoReply(validInput());
    const [payload] = sendMock.mock.calls[0];
    expect(payload).not.toHaveProperty("html");
  });

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
  });

  it("uses the caller's topic in the thanks line (the /cold-email wording), leaving the rest unchanged", async () => {
    await sendAgencyAutoReply(validInput({ topic: "your business" }));
    const [payload] = sendMock.mock.calls[0];
    const lines = (payload.text as string).split("\n");
    expect(lines[2]).toBe("Thanks for reaching out about cold email for your business.");
    expect(payload.text).not.toContain("your agency");
    expect(payload.subject).toBe("Got your details, Jordan");
  });

  it("uses the visitor-controlled first name in the plain-text body literally (no HTML escaping needed for a text-only email)", async () => {
    await sendAgencyAutoReply(validInput({ name: "O'Brien Agency" }));
    const [payload] = sendMock.mock.calls[0];
    expect(payload.text).toContain("Hi O'Brien,");
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
