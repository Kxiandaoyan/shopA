import { OrderStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { resolveAffiliateReturnStatus } from "@/lib/affiliate/callback-delivery";

describe("resolveAffiliateReturnStatus", () => {
  it("maps terminal order states to affiliate callback states", () => {
    expect(resolveAffiliateReturnStatus(OrderStatus.PAID)).toBe("paid");
    expect(resolveAffiliateReturnStatus(OrderStatus.FAILED)).toBe("failed");
    expect(resolveAffiliateReturnStatus(OrderStatus.EXPIRED)).toBe("expired");
    expect(resolveAffiliateReturnStatus(OrderStatus.CANCELED)).toBe("canceled");
  });

  it("rejects non-terminal states", () => {
    expect(resolveAffiliateReturnStatus(OrderStatus.DRAFT)).toBeNull();
    expect(resolveAffiliateReturnStatus(OrderStatus.LANDING_VISITED)).toBeNull();
    expect(resolveAffiliateReturnStatus(OrderStatus.CHECKOUT_CREATED)).toBeNull();
  });
});
