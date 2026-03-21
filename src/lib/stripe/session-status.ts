import { PaymentStatus, OrderStatus } from "@prisma/client";
import Stripe from "stripe";

export function mapCheckoutSessionToState(session: Stripe.Checkout.Session) {
  if (session.payment_status === "paid") {
    return {
      orderStatus: OrderStatus.PAID,
      paymentStatus: PaymentStatus.SUCCEEDED,
      resultStatus: "paid",
    };
  }

  if (session.status === "expired") {
    return {
      orderStatus: OrderStatus.EXPIRED,
      paymentStatus: PaymentStatus.EXPIRED,
      resultStatus: "expired",
    };
  }

  return {
    orderStatus: OrderStatus.CANCELED,
    paymentStatus: PaymentStatus.CANCELED,
    resultStatus: "canceled",
  };
}
