import { beforeEach, describe, expect, it, vi } from "vitest";

describe("encryption helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.STRIPE_SECRET_ENCRYPTION_KEY = "unit-test-key";
  });

  it("encrypts and decrypts a value symmetrically", async () => {
    const { decryptValue, encryptValue } = await import("@/lib/security/encryption");
    const encrypted = encryptValue("sk_test_123456");

    expect(encrypted.startsWith("enc:")).toBe(true);
    expect(decryptValue(encrypted)).toBe("sk_test_123456");
  });

  it("returns plain values unchanged for backward compatibility", async () => {
    const { decryptValue } = await import("@/lib/security/encryption");

    expect(decryptValue("plain-secret")).toBe("plain-secret");
  });
});
