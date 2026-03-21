import { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";

export type LandingOrderContext = {
  orderId: string;
  token: string;
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  buyerName: string;
  landingDomainId: string;
  landingHostname: string;
  returnUrl: string | null;
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
    token: order.token,
    status: order.status,
    totalAmount: Number(order.totalAmount),
    currency: order.currency,
    buyerName: `${order.buyerFirstName} ${order.buyerLastName}`,
    landingDomainId: order.landingDomainId,
    landingHostname: order.landingDomain.hostname,
    returnUrl: order.returnUrl,
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
    })),
  } satisfies LandingOrderContext;
}
