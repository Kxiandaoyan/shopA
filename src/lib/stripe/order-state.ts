import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { writeRedirectLog } from "@/lib/logging/events";

type ApplyPaymentStateInput = {
  orderId: string;
  landingDomainId: string;
  stripeSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  eventType: string;
  requestUrl?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

export function resolveOrderStatusTransition(
  currentOrderStatus: OrderStatus,
  hasSucceededPayment: boolean,
  incomingOrderStatus: OrderStatus,
) {
  if ((currentOrderStatus === OrderStatus.PAID || hasSucceededPayment) && incomingOrderStatus !== OrderStatus.PAID) {
    return OrderStatus.PAID;
  }

  return incomingOrderStatus;
}

export function resolvePaymentStatusTransition(
  currentPaymentStatus: PaymentStatus,
  incomingPaymentStatus: PaymentStatus,
) {
  if (
    currentPaymentStatus === PaymentStatus.SUCCEEDED &&
    incomingPaymentStatus !== PaymentStatus.SUCCEEDED
  ) {
    return PaymentStatus.SUCCEEDED;
  }

  return incomingPaymentStatus;
}

export async function applyPaymentState(input: ApplyPaymentStateInput) {
  let resolvedOrderStatus = input.orderStatus;

  await db.$transaction(async (tx) => {
    const currentOrder = await tx.order.findUnique({
      where: { id: input.orderId },
      select: { status: true },
    });

    if (!currentOrder) {
      return;
    }

    const hasSucceededPayment = Boolean(
      await tx.paymentSession.findFirst({
        where: {
          orderId: input.orderId,
          status: PaymentStatus.SUCCEEDED,
        },
        select: { id: true },
      }),
    );

    const nextOrderStatus = resolveOrderStatusTransition(
      currentOrder.status,
      hasSucceededPayment,
      input.orderStatus,
    );
    resolvedOrderStatus = nextOrderStatus;

    await tx.order.update({
      where: { id: input.orderId },
      data: {
        status: nextOrderStatus,
      },
    });

    if (input.stripeSessionId || input.stripePaymentIntentId) {
      const existing = await tx.paymentSession.findFirst({
        where: {
          orderId: input.orderId,
          OR: [
            input.stripeSessionId ? { stripeSessionId: input.stripeSessionId } : undefined,
            input.stripePaymentIntentId
              ? { stripePaymentIntentId: input.stripePaymentIntentId }
              : undefined,
          ].filter(Boolean) as Prisma.PaymentSessionWhereInput[],
        },
      });

      if (existing) {
        const nextPaymentStatus = resolvePaymentStatusTransition(
          existing.status,
          input.paymentStatus,
        );

        await tx.paymentSession.update({
          where: { id: existing.id },
          data: {
            status: nextPaymentStatus,
            stripeSessionId: input.stripeSessionId ?? existing.stripeSessionId,
            stripePaymentIntentId:
              input.stripePaymentIntentId ?? existing.stripePaymentIntentId,
          },
        });
      }
    }
  });

  await writeRedirectLog({
    orderId: input.orderId,
    landingDomainId: input.landingDomainId,
    eventType: input.eventType,
    status: resolvedOrderStatus,
    requestUrl: input.requestUrl,
    metadata: input.metadata,
  });
}
