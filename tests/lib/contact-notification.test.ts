import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.hoisted(() => vi.fn());
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

import { sendContactNotification, type ContactNotificationInput } from "@/lib/contact-notification";

function validInput(overrides: Partial<ContactNotificationInput> = {}): ContactNotificationInput {
  return {
    inquiryId: "64f000000000000000000123",
    name: "Jordan Rivera",
    email: "jordan@acme.com",
    company: "Acme Inc",
    website: "https://acme.com",
    service: "cold-email-outreach",
    budgetRange: "5k-10k",
    goals: "Book 15+ qualified sales calls per month by Q4.",
    createdAt: new Date("2026-09-04T12:34:00.000Z"),
    ...overrides,
  };
}

beforeEach(() => {
  sendMock.mockReset();
  sendMock.mockResolvedValue({ data: { id: "email_1" }, error: null });
  vi.unstubAllEnvs();
  vi.stubEnv("RESEND_API_KEY", "test-resend-key");
  vi.stubEnv("RESEND_FROM_EMAIL", "Outbound BD <notifications@updates.outboundbd.com>");
  vi.stubEnv("CONTACT_NOTIFICATION_EMAIL", "hello@outboundbd.com");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sendContactNotification — configuration sourcing", () => {
  it("sends exactly once, recipient only from CONTACT_NOTIFICATION_EMAIL, sender only from RESEND_FROM_EMAIL, reply-to the visitor email", async () => {
    const result = await sendContactNotification(validInput());
    expect(result.ok).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(1);

    const [payload] = sendMock.mock.calls[0];
    expect(payload.to).toBe("hello@outboundbd.com");
    expect(payload.from).toBe("Outbound BD <notifications@updates.outboundbd.com>");
    expect(payload.replyTo).toBe("jordan@acme.com");
  });

  it("never lets the caller override recipient/sender/reply-to — only the env vars and the validated visitor email are used", async () => {
    // `ContactNotificationInput` has no recipient/sender/reply-to field at
    // all (see the interface) — the type system itself is the primary
    // guard; this confirms the runtime behavior matches.
    await sendContactNotification(validInput());
    const [payload] = sendMock.mock.calls[0];
    expect(payload.to).toBe(process.env.CONTACT_NOTIFICATION_EMAIL);
    expect(payload.from).toBe(process.env.RESEND_FROM_EMAIL);
  });

  it("returns CONTACT_NOTIFICATION_NOT_CONFIGURED and sends nothing when CONTACT_NOTIFICATION_EMAIL is unset", async () => {
    vi.stubEnv("CONTACT_NOTIFICATION_EMAIL", "");
    const result = await sendContactNotification(validInput());
    expect(result).toEqual({ ok: false, errorCode: "CONTACT_NOTIFICATION_NOT_CONFIGURED" });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("returns EMAIL_NOT_CONFIGURED and sends nothing when RESEND_API_KEY is unset", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const result = await sendContactNotification(validInput());
    expect(result).toEqual({ ok: false, errorCode: "EMAIL_NOT_CONFIGURED" });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("returns SENDER_NOT_CONFIGURED and sends nothing when RESEND_FROM_EMAIL is unset", async () => {
    vi.stubEnv("RESEND_FROM_EMAIL", "");
    const result = await sendContactNotification(validInput());
    expect(result).toEqual({ ok: false, errorCode: "SENDER_NOT_CONFIGURED" });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("importing this module never throws even with no email env configured at all", async () => {
    vi.unstubAllEnvs();
    await expect(import("@/lib/contact-notification")).resolves.toBeTruthy();
  });
});

describe("sendContactNotification — email content", () => {
  it("HTML and plain-text bodies contain every required field plus the MongoDB inquiry ID", async () => {
    await sendContactNotification(validInput());
    const [payload] = sendMock.mock.calls[0];

    for (const expected of [
      "Jordan Rivera",
      "jordan@acme.com",
      "Acme Inc",
      "https://acme.com",
      "Book 15+ qualified sales calls per month by Q4.",
      "64f000000000000000000123",
    ]) {
      expect(payload.html).toContain(expected);
      expect(payload.text).toContain(expected);
    }

    // Requested service / budget are rendered as their human-readable
    // labels (resolved from the same option lists the form itself uses),
    // not the raw stored slug.
    expect(payload.html).toContain("Cold Email Outreach");
    expect(payload.text).toContain("Cold Email Outreach");
    expect(payload.html).toContain("$5,000");
    expect(payload.text).toContain("$5,000");
  });

  it("escapes visitor-controlled HTML so it cannot inject markup, while the plain-text body keeps it literal", async () => {
    const result = await sendContactNotification(
      validInput({ name: "<img src=x onerror=alert(1)>", goals: "Ship <b>fast</b> & scale" }),
    );
    expect(result.ok).toBe(true);
    const [payload] = sendMock.mock.calls[0];

    expect(payload.html).not.toContain("<img src=x onerror=alert(1)>");
    expect(payload.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(payload.html).not.toContain("<b>fast</b>");
    expect(payload.html).toContain("Ship &lt;b&gt;fast&lt;/b&gt; &amp; scale");

    // The plain-text body is never HTML-rendered, so it's fine (and
    // expected) for it to carry the raw text unescaped.
    expect(payload.text).toContain("Ship <b>fast</b> & scale");
  });

  it("renders a clear placeholder instead of literal 'undefined' for an empty/optional value", async () => {
    await sendContactNotification(validInput({ website: "" }));
    const [payload] = sendMock.mock.calls[0];

    expect(payload.html).not.toMatch(/undefined/i);
    expect(payload.text).not.toMatch(/undefined/i);
    expect(payload.html).toContain("(not provided)");
    expect(payload.text).toContain("(not provided)");
  });

  it("falls back to the raw stored value for an unrecognized service/budget slug instead of throwing", async () => {
    const result = await sendContactNotification(
      validInput({ service: "some-legacy-slug", budgetRange: "some-legacy-range" }),
    );
    expect(result.ok).toBe(true);
    const [payload] = sendMock.mock.calls[0];
    expect(payload.html).toContain("some-legacy-slug");
    expect(payload.html).toContain("some-legacy-range");
  });
});

describe("sendContactNotification — header/subject safety", () => {
  it("strips CR/LF from a visitor-controlled name before it reaches the subject line, so no second header line can be injected", async () => {
    await sendContactNotification(
      validInput({ name: "Jordan\r\nBcc: attacker@evil.example" }),
    );
    const [payload] = sendMock.mock.calls[0];

    // The security property that matters: the subject is a single line, so
    // "Bcc: attacker@evil.example" can never start a real second header —
    // it becomes inert trailing text on the one subject line, not a
    // newly-injected header.
    expect(payload.subject).not.toMatch(/[\r\n]/);
    expect(payload.subject.split("\n")).toHaveLength(1);
    expect(String(payload.subject)).toContain("Jordan");
  });

  it("strips CR/LF from the visitor email before it is used as Reply-To, so no second header line can be injected", async () => {
    // The zod inquiry schema would reject this as an invalid email before
    // this module ever sees it — this test exercises the module's own
    // defense-in-depth independent of that upstream validation.
    await sendContactNotification(validInput({ email: "jordan@acme.com\r\nX-Injected: 1" }));
    const [payload] = sendMock.mock.calls[0];

    expect(payload.replyTo).not.toMatch(/[\r\n]/);
    expect(payload.replyTo.split("\n")).toHaveLength(1);
  });
});

describe("sendContactNotification — Resend failure handling", () => {
  it("returns PROVIDER_ERROR when Resend reports an error", async () => {
    sendMock.mockResolvedValueOnce({ data: null, error: { message: "invalid request" } });
    const result = await sendContactNotification(validInput());
    expect(result).toEqual({ ok: false, errorCode: "PROVIDER_ERROR" });
  });

  it("returns NETWORK_ERROR when the Resend call throws, without throwing itself", async () => {
    sendMock.mockRejectedValueOnce(new Error("network down"));
    await expect(sendContactNotification(validInput())).resolves.toEqual({
      ok: false,
      errorCode: "NETWORK_ERROR",
    });
  });
});
