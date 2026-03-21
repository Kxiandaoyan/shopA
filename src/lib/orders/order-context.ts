import { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { DIRECT_AFFILIATE_CODE } from "@/lib/storefront/direct-order";
import {
  normalizeAffiliateCheckoutNameMode,
  type AffiliateCheckoutNameMode,
} from "@/lib/stripe/checkout-name-mode";

export type OrderMode = "affiliate_intake" | "direct_storefront";

export type LandingOrderContext = {
  orderId: string;
  externalOrderId: string;
  token: string;
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  buyerName: string;
  orderMode: OrderMode;
  landingDomainId: string;
  landingHostname: string;
  returnUrl: string | null;
  affiliateCheckoutNameMode: AffiliateCheckoutNameMode;
  affiliateCheckoutFixedName: string | null;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
};

export async function loadOrderContextByToken(token: string, host?: string) {
  const order = await db.order.findUnique({
    where: { token },
    include: {
      affiliate: {
        select: {
          code: true,
        },
      },
      items: true,
      landingDomain: true,
    },
  });

  if (!order) {
    return null;
  }

  if (host && order.landingDomain.hostname !== host) {
    return null;
  }

  return {
    orderId: order.id,
    externalOrderId: order.externalOrderId,
    token: order.token,
    status: order.status,
    totalAmount: Number(order.totalAmount),
    currency: order.currency,
    buyerName: `${order.buyerFirstName} ${order.buyerLastName}`,
    orderMode:
      order.affiliate.code === DIRECT_AFFILIATE_CODE
        ? "direct_storefront"
        : "affiliate_intake",
    landingDomainId: order.landingDomainId,
    landingHostname: order.landingDomain.hostname,
    returnUrl: order.returnUrl,
    affiliateCheckoutNameMode: normalizeAffiliateCheckoutNameMode(
      order.landingDomain.affiliateCheckoutNameMode,
    ),
    affiliateCheckoutFixedName: order.landingDomain.affiliateCheckoutFixedName,
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
    })),
  } satisfies LandingOrderContext;
}
