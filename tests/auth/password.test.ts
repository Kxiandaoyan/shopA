import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password helpers", () => {
  it("hashes and verifies passwords", () => {
    const hashed = hashPassword("super-secret");

    expect(hashed.startsWith("scrypt:")).toBe(true);
    expect(verifyPassword("super-secret", hashed)).toBe(true);
    expect(verifyPassword("wrong-password", hashed)).toBe(false);
  });
});
