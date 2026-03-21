import { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { writeRedirectLog } from "@/lib/logging/events";

export async function markLandingVisited(orderId: string, landingDomainId: string, requestUrl?: string) {
  const order = await db.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.LANDING_VISITED,
    },
  });

  await writeRedirectLog({
    orderId,
    landingDomainId,
    eventType: "landing.visited",
    status: order.status,
    requestUrl,
    metadata: {
      nextAction: "/checkout/redirect",
    },
  });

  return order;
}
