import { PaymentStatus, Prisma, OrderStatus } from "@prisma/client";
import Stripe from "stripe";
import { db } from "@/lib/db";
import type { LandingOrderContext } from "@/lib/orders/order-context";
import { getStorefrontProducts } from "@/lib/products/catalog";
import { writeRedirectLog } from "@/lib/logging/events";
import { normalizeAffiliateCheckoutNameMode } from "@/lib/stripe/checkout-name-mode";
import { createStripeClient, loadStripeBindingByDomainId } from "@/lib/stripe/client";
import { buildOrigin } from "@/lib/stripe/urls";

const DEFAULT_AFFILIATE_CHECKOUT_NAME = "Store order";
const DEFAULT_SOURCE_PRODUCT_NAME = "Imported item";

function selectStableCatalogName(order: LandingOrderContext, names: string[]) {
  if (names.length === 0) {
    return DEFAULT_AFFILIATE_CHECKOUT_NAME;
  }

  const seed = `${order.orderId}:${order.externalOrderId}:${order.token}`;
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return names[hash % names.length] ?? DEFAULT_AFFILIATE_CHECKOUT_NAME;
}

function resolveSourceProductName(order: LandingOrderContext) {
  return (
    order.items
      .map((item) => item.productName.trim())
      .find((name) => name.length > 0) ?? DEFAULT_SOURCE_PRODUCT_NAME
  );
}

async function resolveAffiliateCheckoutProductName(order: LandingOrderContext) {
  switch (normalizeAffiliateCheckoutNameMode(order.affiliateCheckoutNameMode)) {
    case "FIXED":
      return order.affiliateCheckoutFixedName?.trim() || DEFAULT_AFFILIATE_CHECKOUT_NAME;
    case "SOURCE_PRODUCT":
      return resolveSourceProductName(order);
    case "CATALOG_RANDOM":
    default:
      try {
        const storefrontProducts = await getStorefrontProducts(24);
        return selectStableCatalogName(
          order,
          storefrontProducts
            .map((product) => product.name.trim())
            .filter((name) => name.length > 0),
        );
      } catch {
        return DEFAULT_AFFILIATE_CHECKOUT_NAME;
      }
  }
}

export async function buildHostedCheckoutLineItems(
  order: LandingOrderContext,
): Promise<Stripe.Checkout.SessionCreateParams.LineItem[]> {
  if (order.orderMode === "affiliate_intake") {
    const productName = await resolveAffiliateCheckoutProductName(order);

    return [
      {
        quantity: 1,
        price_data: {
          currency: order.currency.toLowerCase(),
          product_data: {
            name: productName,
          },
          unit_amount: Math.round(order.totalAmount * 100),
        },
      },
    ];
  }

  return order.items.map((item) => ({
    quantity: item.quantity,
    price_data: {
      currency: order.currency.toLowerCase(),
      product_data: {
        name: item.productName,
      },
      unit_amount: Math.round(item.unitPrice * 100),
    },
  }));
}

function sumOrderItemAmount(order: LandingOrderContext) {
  return Number(
    order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0).toFixed(2),
  );
}

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
  const lineItems = await buildHostedCheckoutLineItems(input.order);
  const itemSubtotal = sumOrderItemAmount(input.order);
  const pricingMode =
    input.order.orderMode === "affiliate_intake" ? "affiliate_total" : "direct_itemized";
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${origin}/payment/success?token=${input.order.token}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/payment/cancel?token=${input.order.token}&session_id={CHECKOUT_SESSION_ID}`,
    line_items: lineItems,
    metadata: {
      orderId: input.order.orderId,
      landingDomainId: input.order.landingDomainId,
      token: input.order.token,
      orderMode: input.order.orderMode,
      pricingMode,
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
          pricingMode,
          orderMode: input.order.orderMode,
          affiliateCheckoutNameMode: normalizeAffiliateCheckoutNameMode(
            input.order.affiliateCheckoutNameMode,
          ),
          affiliateCheckoutFixedName: input.order.affiliateCheckoutFixedName,
          orderTotalAmount: input.order.totalAmount,
          itemSubtotal,
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
      pricingMode,
      affiliateCheckoutNameMode: normalizeAffiliateCheckoutNameMode(
        input.order.affiliateCheckoutNameMode,
      ),
      orderTotalAmount: input.order.totalAmount,
      itemSubtotal,
    },
  });

  return {
    ok: true as const,
    checkoutUrl: session.url,
  };
}
