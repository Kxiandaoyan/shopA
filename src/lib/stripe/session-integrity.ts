import Stripe from "stripe";
import type { LandingOrderContext } from "@/lib/orders/order-context";

export function sessionMatchesOrderContext(
  session: Stripe.Checkout.Session,
  order: LandingOrderContext,
) {
  return (
    session.metadata?.orderId === order.orderId &&
    session.metadata?.landingDomainId === order.landingDomainId &&
    session.metadata?.token === order.token
  );
}
