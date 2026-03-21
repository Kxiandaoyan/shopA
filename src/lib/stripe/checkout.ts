import { PaymentStatus, Prisma, OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import type { LandingOrderContext } from "@/lib/orders/order-context";
import { writeRedirectLog } from "@/lib/logging/events";
import { createStripeClient, loadStripeBindingByDomainId } from "@/lib/stripe/client";
import { buildOrigin } from "@/lib/stripe/urls";

export async function createHostedCheckoutSession(input: {
  order: LandingOrderContext;
  host: string;
  protocol?: string;
}) {
  const stripeBinding = await loadStripeBindingByDomainId(input.order.landingDomainId);

  if (!stripeBinding) {
    return { ok: false as const, reason: "STRIPE_NOT_CONFIGURED" };
  }

  if (input.order.status === OrderStatus.PAID) {
    return { ok: false as const, reason: "ORDER_ALREADY_PAID" };
  }

  const stripe = createStripeClient(stripeBinding.secretKey);
  const reusablePaymentSession = await db.paymentSession.findFirst({
    where: {
      orderId: input.order.orderId,
      stripeAccountId: stripeBinding.stripeAccountId,
      status: PaymentStatus.CREATED,
      stripeSessionId: {
        not: null,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (reusablePaymentSession?.stripeSessionId) {
    const existingSession = await stripe.checkout.sessions.retrieve(
      reusablePaymentSession.stripeSessionId,
    );

    if (existingSession.status === "open" && existingSession.url) {
      await writeRedirectLog({
        orderId: input.order.orderId,
        landingDomainId: input.order.landingDomainId,
        eventType: "checkout.session_reused",
        status: input.order.status,
        metadata: {
          stripeSessionId: existingSession.id,
        },
      });

      return {
        ok: true as const,
        checkoutUrl: existingSession.url,
      };
    }
  }

  const origin = buildOrigin(input.host, input.protocol ?? "https");
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${origin}/payment/success?token=${input.order.token}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/payment/cancel?token=${input.order.token}&session_id={CHECKOUT_SESSION_ID}`,
    line_items: input.order.items.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: input.order.currency.toLowerCase(),
        product_data: {
          name: item.productName,
        },
        unit_amount: Math.round(item.unitPrice * 100),
      },
    })),
    metadata: {
      orderId: input.order.orderId,
      landingDomainId: input.order.landingDomainId,
      token: input.order.token,
    },
  });

  await db.$transaction([
    db.order.update({
      where: { id: input.order.orderId },
      data: {
        status: OrderStatus.CHECKOUT_CREATED,
      },
    }),
    db.paymentSession.create({
      data: {
        orderId: input.order.orderId,
        stripeAccountId: stripeBinding.stripeAccountId,
        stripeSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
        status: PaymentStatus.CREATED,
        amount: new Prisma.Decimal(input.order.totalAmount),
        currency: input.order.currency,
        metadata: {
          accountLabel: stripeBinding.accountLabel,
          checkoutUrl: session.url,
        },
      },
    }),
  ]);

  await writeRedirectLog({
    orderId: input.order.orderId,
    landingDomainId: input.order.landingDomainId,
    eventType: "checkout.session_created",
    status: OrderStatus.CHECKOUT_CREATED,
    metadata: {
      stripeSessionId: session.id,
      stripeAccountId: stripeBinding.stripeAccountId,
    },
  });

  return {
    ok: true as const,
    checkoutUrl: session.url,
  };
}
