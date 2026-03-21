import { OrderStatus, PaymentStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  resolveOrderStatusTransition,
  resolvePaymentStatusTransition,
} from "@/lib/stripe/order-state";

describe("resolveOrderStatusTransition", () => {
  it("keeps paid orders from being downgraded", () => {
    expect(
      resolveOrderStatusTransition(OrderStatus.PAID, true, OrderStatus.CANCELED),
    ).toBe(OrderStatus.PAID);
  });

  it("allows a non-paid order to become paid", () => {
    expect(
      resolveOrderStatusTransition(OrderStatus.CHECKOUT_CREATED, false, OrderStatus.PAID),
    ).toBe(OrderStatus.PAID);
  });
});

describe("resolvePaymentStatusTransition", () => {
  it("keeps successful payment status from being downgraded", () => {
    expect(
      resolvePaymentStatusTransition(PaymentStatus.SUCCEEDED, PaymentStatus.CANCELED),
    ).toBe(PaymentStatus.SUCCEEDED);
  });

  it("accepts incoming success over a non-success status", () => {
    expect(
      resolvePaymentStatusTransition(PaymentStatus.CREATED, PaymentStatus.SUCCEEDED),
    ).toBe(PaymentStatus.SUCCEEDED);
  });
});
