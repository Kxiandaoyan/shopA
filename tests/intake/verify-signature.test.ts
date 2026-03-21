import { describe, expect, it } from "vitest";
import { createIntakeSignature, verifyIntakeSignature } from "@/lib/intake/verify-signature";

describe("intake signature", () => {
  it("creates and verifies a valid signature with an explicit secret", () => {
    const unsignedPayload = {
      affiliateCode: "AFF_001",
      externalOrderId: "EXT-001",
      timestamp: 1_700_000_000,
      nonce: "nonce-123",
      buyer: {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "+15550000000",
        country: "US",
        state: "CA",
        city: "Los Angeles",
        address1: "123 Main St",
        address2: "",
        postalCode: "90001",
      },
      totalAmount: 29.99,
      currency: "USD",
      items: [
        {
          productId: "clean001",
          name: "SmartSpray Microfiber Floor Mop",
          quantity: 1,
          unitPrice: 29.99,
        },
      ],
      returnUrl: "https://aaa.com/order-complete",
    };

    const signature = createIntakeSignature(unsignedPayload, "intake-secret");

    expect(
      verifyIntakeSignature(
        {
          ...unsignedPayload,
          signature,
        },
        "intake-secret",
      ),
    ).toBe(true);
  });

  it("rejects a forged signature", () => {
    expect(
      verifyIntakeSignature(
        {
          affiliateCode: "AFF_001",
          externalOrderId: "EXT-001",
          timestamp: 1_700_000_000,
          nonce: "nonce-123",
          buyer: {
            firstName: "John",
            lastName: "Doe",
            email: "john@example.com",
            phone: "+15550000000",
            country: "US",
            state: "CA",
            city: "Los Angeles",
            address1: "123 Main St",
            address2: "",
            postalCode: "90001",
          },
          totalAmount: 29.99,
          currency: "USD",
          items: [
            {
              productId: "clean001",
              name: "SmartSpray Microfiber Floor Mop",
              quantity: 1,
              unitPrice: 29.99,
            },
          ],
          returnUrl: "https://aaa.com/order-complete",
          signature: "fake-signature",
        },
        "intake-secret",
      ),
    ).toBe(false);
  });
});
