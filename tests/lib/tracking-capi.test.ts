import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sendLeadEvent, type SendLeadEventInput } from "@/lib/tracking/capi";

function validInput(overrides: Partial<SendLeadEventInput> = {}): SendLeadEventInput {
  return {
    pixelId: "123456",
    accessToken: "test-token",
    eventId: "evt-1",
    email: "jordan@acme.com",
    eventSourceUrl: "https://outboundbd.com/contact",
    clientIpAddress: "203.0.113.10",
    clientUserAgent: "test-agent",
    fbp: "fb.1.111",
    fbc: "fb.1.222",
    ...overrides,
  };
}

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sendLeadEvent", () => {
  it("sends a Lead event with a hashed (not plaintext) email and the given event_id", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

    const result = await sendLeadEvent(validInput());
    expect(result).toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("123456/events");
    expect(String(url)).toContain("access_token=test-token");

    const body = JSON.parse(init.body as string);
    const event = body.data[0];
    expect(event.event_name).toBe("Lead");
    expect(event.event_id).toBe("evt-1");
    expect(event.event_source_url).toBe("https://outboundbd.com/contact");
    expect(event.user_data.em[0]).not.toBe("jordan@acme.com");
    expect(event.user_data.em[0]).toMatch(/^[a-f0-9]{64}$/);
    expect(event.user_data.fbp).toBe("fb.1.111");
    expect(event.user_data.fbc).toBe("fb.1.222");
  });

  it("hashes the email lowercased and trimmed, so casing/whitespace differences still match", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    await sendLeadEvent(validInput({ email: "Jordan@Acme.com" }));
    const [, initA] = fetchMock.mock.calls[0];
    const hashA = JSON.parse(initA.body as string).data[0].user_data.em[0];

    await sendLeadEvent(validInput({ email: "  jordan@acme.com  " }));
    const [, initB] = fetchMock.mock.calls[1];
    const hashB = JSON.parse(initB.body as string).data[0].user_data.em[0];

    expect(hashA).toBe(hashB);
  });

  it("returns an HTTP_<status> error code and never throws when Meta responds with an error, without leaking the response body", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: "sensitive detail" } }), { status: 400 }),
    );

    const result = await sendLeadEvent(validInput());
    expect(result).toEqual({ ok: false, errorCode: "HTTP_400" });
  });

  it("returns NETWORK_ERROR when fetch rejects, without throwing", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    await expect(sendLeadEvent(validInput())).resolves.toEqual({
      ok: false,
      errorCode: "NETWORK_ERROR",
    });
  });
});
