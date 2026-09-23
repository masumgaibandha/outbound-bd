import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getBotSubmissionSkipReason, logLeadSubmissionSkipped } from "@/lib/inquiry-submission";

describe("getBotSubmissionSkipReason", () => {
  it("returns 'honeypot' when the honeypot field is filled", () => {
    expect(
      getBotSubmissionSkipReason({ honeypot: "http://spam.example", startedAt: Date.now() - 5000 }),
    ).toBe("honeypot");
  });

  it("returns null when the honeypot field is empty and fill time is normal", () => {
    expect(getBotSubmissionSkipReason({ honeypot: "", startedAt: Date.now() - 5000 })).toBeNull();
  });

  it("returns 'too_fast' when submitted faster than the 1500ms minimum", () => {
    expect(
      getBotSubmissionSkipReason({ honeypot: "", startedAt: Date.now() - 1400 }),
    ).toBe("too_fast");
  });

  it("does not flag a 1.6 second submission as too fast (autofill-speed humans)", () => {
    expect(
      getBotSubmissionSkipReason({ honeypot: "", startedAt: Date.now() - 1600 }),
    ).toBeNull();
  });

  it("honeypot takes priority when both conditions are true", () => {
    expect(
      getBotSubmissionSkipReason({ honeypot: "spam", startedAt: Date.now() }),
    ).toBe("honeypot");
  });

  it("treats a missing or non-numeric startedAt as not-too-fast (never throws)", () => {
    expect(getBotSubmissionSkipReason({ honeypot: "" })).toBeNull();
    expect(getBotSubmissionSkipReason({ honeypot: "", startedAt: "not-a-number" })).toBeNull();
  });

  it("treats a non-string honeypot as not tripped", () => {
    expect(getBotSubmissionSkipReason({ honeypot: 123, startedAt: Date.now() - 5000 })).toBeNull();
  });
});

describe("logLeadSubmissionSkipped", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs one structured, non-sensitive line per reason", () => {
    logLeadSubmissionSkipped("/api/inquiries", "honeypot");
    logLeadSubmissionSkipped("/api/agencies-lead", "too_fast");
    logLeadSubmissionSkipped("/api/inquiries", "duplicate");

    expect(console.log).toHaveBeenCalledTimes(3);
    const calls = vi.mocked(console.log).mock.calls.map((call) => JSON.parse(call[0] as string));

    expect(calls[0]).toEqual({ event: "lead_submission_skipped", route: "/api/inquiries", reason: "honeypot" });
    expect(calls[1]).toEqual({ event: "lead_submission_skipped", route: "/api/agencies-lead", reason: "too_fast" });
    expect(calls[2]).toEqual({ event: "lead_submission_skipped", route: "/api/inquiries", reason: "duplicate" });
  });

  it("never includes any field other than event/route/reason (no personal data)", () => {
    logLeadSubmissionSkipped("/api/inquiries", "honeypot");
    const logged = JSON.parse(vi.mocked(console.log).mock.calls[0][0] as string);
    expect(Object.keys(logged).sort()).toEqual(["event", "reason", "route"]);
  });
});
