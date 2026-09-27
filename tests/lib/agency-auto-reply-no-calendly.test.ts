import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.hoisted(() => vi.fn());
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

// Simulates CALENDLY_URL being cleared in site-config. STRATEGY_CALL_HREF
// would then fall back to the relative "/contact", which must never end up
// in an email.
vi.mock("@/components/public/site-config", () => ({
  CALENDLY_URL: "",
  STRATEGY_CALL_HREF: "/contact",
}));

import { sendAgencyAutoReply } from "@/lib/agency-auto-reply";

beforeEach(() => {
  sendMock.mockReset();
  sendMock.mockResolvedValue({ data: { id: "email_1" }, error: null });
  vi.stubEnv("RESEND_API_KEY", "test-resend-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("sendAgencyAutoReply — CALENDLY_URL missing", () => {
  it.each([
    ["landing", { topic: "your business" }, "I'll look at your site and reply personally within one business day."],
    ["contact", { variant: "contact" as const }, "I'll read through what you sent and reply personally within one business day."],
  ])("the %s variant omits the booking line entirely and still sends", async (_label, variant, replyLine) => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await sendAgencyAutoReply({
      inquiryId: "64f000000000000000000456",
      name: "Jordan Rivera",
      email: "jordan@agency.com",
      ...variant,
    });
    expect(result).toEqual({ ok: true });

    const [payload] = sendMock.mock.calls[0];
    const lines = (payload.text as string).split("\n");
    expect(lines.slice(3)).toEqual(["", replyLine, "", "Masum", "Outbound BD"]);
    expect(payload.text).not.toContain("book a time");
    expect(payload.text).not.toContain("/contact");

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const logged = warnSpy.mock.calls[0][0] as string;
    expect(JSON.parse(logged)).toEqual({
      event: "auto_reply_booking_link_missing",
      inquiryId: "64f000000000000000000456",
    });
    expect(logged).not.toContain("Jordan");
    expect(logged).not.toContain("jordan@agency.com");
  });
});
