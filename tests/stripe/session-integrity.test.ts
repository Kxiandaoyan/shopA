import Stripe from "stripe";
import { describe, expect, it } from "vitest";
import type { LandingOrderContext } from "@/lib/orders/order-context";
import { sessionMatchesOrderContext } from "@/lib/stripe/session-integrity";

const order: LandingOrderContext = {
  orderId: "ord_123",
  externalOrderId: "AFF-20260321-001",
  token: "tok_123",
  status: "DRAFT",
  totalAmount: 99,
  currency: "USD",
  buyerName: "Jane Doe",
  orderMode: "affiliate_intake",
  landingDomainId: "dom_123",
  landingHostname: "pay.example.com",
  returnUrl: "https://affiliate.example.com/return",
  items: [],
};

function buildSession(metadata?: Record<string, string>) {
  return {
    metadata,
  } as Stripe.Checkout.Session;
}

describe("sessionMatchesOrderContext", () => {
  it("accepts a Stripe session that belongs to the current order context", () => {
    expect(
      sessionMatchesOrderContext(
        buildSession({
          orderId: order.orderId,
          landingDomainId: order.landingDomainId,
          token: order.token,
        }),
        order,
      ),
    ).toBe(true);
  });

  it("rejects a Stripe session with mismatched metadata", () => {
    expect(
      sessionMatchesOrderContext(
        buildSession({
          orderId: order.orderId,
          landingDomainId: order.landingDomainId,
          token: "other-token",
        }),
        order,
      ),
    ).toBe(false);
  });
});
