import { describe, expect, it } from "vitest";
import { buildReturnUrl } from "@/lib/stripe/urls";

describe("buildReturnUrl", () => {
  it("appends order status parameters to the affiliate return url", () => {
    const url = buildReturnUrl("https://aaa.com/complete", {
      orderId: "ord_123",
      status: "paid",
    });

    expect(url).toBe("https://aaa.com/complete?orderId=ord_123&status=paid");
  });

  it("preserves existing query parameters", () => {
    const url = buildReturnUrl("https://aaa.com/complete?channel=x", {
      orderId: "ord_123",
      status: "failed",
    });

    expect(url).toContain("channel=x");
    expect(url).toContain("orderId=ord_123");
    expect(url).toContain("status=failed");
  });
});
