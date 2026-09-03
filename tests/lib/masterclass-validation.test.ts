import { describe, expect, it } from "vitest";

import {
  idempotencyKeySchema,
  manualPaymentInputSchema,
  normalizeBangladeshPhone,
  registrationInputSchema,
} from "@/lib/masterclass/validation";

function validRegistration(overrides: Record<string, unknown> = {}) {
  return {
    name: "Rafiq Islam",
    email: "rafiq@example.com",
    phone: "01712345678",
    termsAccepted: true,
    turnstileToken: "a-valid-looking-token",
    honeypot: "",
    startedAt: Date.now() - 5000,
    ...overrides,
  };
}

describe("normalizeBangladeshPhone", () => {
  it("accepts and normalizes all three input shapes to +8801XXXXXXXXX", () => {
    expect(normalizeBangladeshPhone("01712345678")).toBe("+8801712345678");
    expect(normalizeBangladeshPhone("8801712345678")).toBe("+8801712345678");
    expect(normalizeBangladeshPhone("+8801712345678")).toBe("+8801712345678");
  });

  it("rejects non-mobile prefixes and malformed numbers", () => {
    expect(normalizeBangladeshPhone("01212345678")).toBeNull(); // 012 isn't a mobile prefix
    expect(normalizeBangladeshPhone("0171234567")).toBeNull(); // too short
    expect(normalizeBangladeshPhone("not-a-phone")).toBeNull();
  });
});

describe("registrationInputSchema", () => {
  it("accepts a fully valid submission", () => {
    const result = registrationInputSchema.safeParse(validRegistration());
    expect(result.success).toBe(true);
  });

  it.each(["name", "email", "phone", "termsAccepted", "turnstileToken"])(
    "rejects a submission missing required field %s",
    (field) => {
      const payload = validRegistration();
      delete (payload as Record<string, unknown>)[field];
      const result = registrationInputSchema.safeParse(payload);
      expect(result.success).toBe(false);
    },
  );

  it("rejects termsAccepted: false — must be the literal true", () => {
    const result = registrationInputSchema.safeParse(validRegistration({ termsAccepted: false }));
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = registrationInputSchema.safeParse(validRegistration({ email: "not-an-email" }));
    expect(result.success).toBe(false);
  });

  it("rejects an invalid Bangladeshi phone", () => {
    const result = registrationInputSchema.safeParse(validRegistration({ phone: "+15551234567" }));
    expect(result.success).toBe(false);
  });

  it("defaults marketingConsent to false and honeypot to empty string when omitted", () => {
    const payload = validRegistration();
    delete (payload as Record<string, unknown>).honeypot;
    const result = registrationInputSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.marketingConsent).toBe(false);
      expect(result.data.honeypot).toBe("");
    }
  });

  it("does not accept an arbitrary client-submitted price/package field as anything meaningful — schema strips unknown keys", () => {
    const result = registrationInputSchema.safeParse(
      validRegistration({ amount: 1, priceBDT: 1, package: "premium" }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data as Record<string, unknown>).not.toHaveProperty("amount");
      expect(result.data as Record<string, unknown>).not.toHaveProperty("priceBDT");
      expect(result.data as Record<string, unknown>).not.toHaveProperty("package");
    }
  });
});

describe("idempotencyKeySchema", () => {
  it("requires a valid UUID", () => {
    expect(idempotencyKeySchema.safeParse("123e4567-e89b-12d3-a456-426614174000").success).toBe(true);
    expect(idempotencyKeySchema.safeParse("not-a-uuid").success).toBe(false);
    expect(idempotencyKeySchema.safeParse("").success).toBe(false);
  });
});

describe("manualPaymentInputSchema", () => {
  it("only accepts BKASH/NAGAD/ROCKET as a method", () => {
    const base = { senderNumber: "01712345678", transactionId: "ABCD1234" };
    expect(manualPaymentInputSchema.safeParse({ ...base, method: "BKASH" }).success).toBe(true);
    expect(manualPaymentInputSchema.safeParse({ ...base, method: "NAGAD" }).success).toBe(true);
    expect(manualPaymentInputSchema.safeParse({ ...base, method: "ROCKET" }).success).toBe(true);
    expect(manualPaymentInputSchema.safeParse({ ...base, method: "BANK_TRANSFER" }).success).toBe(false);
    expect(manualPaymentInputSchema.safeParse({ ...base, method: "PAYPAL" }).success).toBe(false);
  });

  it("has no amount/currency/status fields at all — the server never trusts a client-submitted price or paid status", () => {
    const shape = manualPaymentInputSchema.shape as Record<string, unknown>;
    expect(shape).not.toHaveProperty("amount");
    expect(shape).not.toHaveProperty("currency");
    expect(shape).not.toHaveProperty("status");
    expect(shape).not.toHaveProperty("paid");
  });

  it("rejects an invalid sender number", () => {
    const result = manualPaymentInputSchema.safeParse({
      method: "BKASH",
      senderNumber: "not-a-phone",
      transactionId: "ABCD1234",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a too-short transaction id", () => {
    const result = manualPaymentInputSchema.safeParse({
      method: "BKASH",
      senderNumber: "01712345678",
      transactionId: "AB",
    });
    expect(result.success).toBe(false);
  });
});
