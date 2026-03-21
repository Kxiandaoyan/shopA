import { OrderStatus, PaymentStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { detectOrderAnomalies } from "@/lib/admin/orders";

describe("detectOrderAnomalies", () => {
  it("flags stale checkout orders without payment sessions", () => {
    const anomalies = detectOrderAnomalies(
      {
        createdAt: new Date("2026-03-17T00:00:00.000Z"),
        status: OrderStatus.CHECKOUT_CREATED,
        landingDomain: {
          stripeAccount: {
            isActive: true,
          },
        },
        paymentSessions: [],
      } as Parameters<typeof detectOrderAnomalies>[0],
      new Date("2026-03-17T01:00:00.000Z"),
    );

    expect(anomalies.map((item) => item.kind)).toContain("STALE_CHECKOUT");
    expect(anomalies.map((item) => item.kind)).toContain("CHECKOUT_WITHOUT_PAYMENT_SESSION");
  });

  it("flags paid orders without successful payments", () => {
    const anomalies = detectOrderAnomalies(
      {
        createdAt: new Date("2026-03-17T00:00:00.000Z"),
        status: OrderStatus.PAID,
        landingDomain: {
          stripeAccount: {
            isActive: true,
          },
        },
        paymentSessions: [
          {
            status: PaymentStatus.CREATED,
          },
        ],
      } as Parameters<typeof detectOrderAnomalies>[0],
      new Date("2026-03-17T00:10:00.000Z"),
    );

    expect(anomalies.map((item) => item.kind)).toContain("PAID_WITHOUT_SUCCESSFUL_PAYMENT");
  });

  it("flags active orders without active stripe binding", () => {
    const anomalies = detectOrderAnomalies(
      {
        createdAt: new Date("2026-03-17T00:00:00.000Z"),
        status: OrderStatus.LANDING_VISITED,
        landingDomain: {
          stripeAccount: null,
        },
        paymentSessions: [],
      } as Parameters<typeof detectOrderAnomalies>[0],
      new Date("2026-03-17T01:00:00.000Z"),
    );

    expect(anomalies.map((item) => item.kind)).toContain("ACTIVE_ORDER_WITHOUT_STRIPE_BINDING");
  });
});
