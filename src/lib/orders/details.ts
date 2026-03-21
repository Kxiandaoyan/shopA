import { db } from "@/lib/db";

function formatJson(value: unknown) {
  if (value == null) {
    return null;
  }

  return JSON.stringify(value, null, 2);
}

async function loadOrderRecord(orderId: string, affiliateIds?: string[]) {
  return db.order.findFirst({
    where: {
      id: orderId,
      ...(affiliateIds ? { affiliateId: { in: affiliateIds } } : {}),
    },
    include: {
      affiliate: true,
      landingDomain: true,
      items: {
        orderBy: { createdAt: "asc" },
      },
      paymentSessions: {
        include: {
          stripeAccount: true,
        },
        orderBy: { createdAt: "desc" },
      },
      intakeRequests: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      redirectLogs: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
}

async function loadOrderInternalNotes(orderId: string) {
  const items = await db.auditLog.findMany({
    where: {
      targetType: "order",
      targetId: orderId,
      eventType: "admin.order_note_added",
    },
    include: {
      actor: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return items.map((item) => ({
    id: item.id,
    actorName: item.actor?.displayName ?? item.actor?.email ?? "系统",
    actorEmail: item.actor?.email ?? null,
    note:
      item.metadata &&
      typeof item.metadata === "object" &&
      !Array.isArray(item.metadata) &&
      "note" in item.metadata &&
      typeof item.metadata.note === "string"
        ? item.metadata.note
        : "",
    createdAt: item.createdAt.toISOString(),
  }));
}

function mapOrderDetail(
  order: Awaited<ReturnType<typeof loadOrderRecord>>,
  internalNotes: Awaited<ReturnType<typeof loadOrderInternalNotes>> = [],
) {
  if (!order) {
    return null;
  }

  return {
    id: order.id,
    externalOrderId: order.externalOrderId,
    status: order.status,
    totalAmount: Number(order.totalAmount),
    currency: order.currency,
    returnUrl: order.returnUrl,
    token: order.token,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    affiliate: {
      id: order.affiliate.id,
      code: order.affiliate.code,
      name: order.affiliate.name,
    },
    landingDomain: {
      id: order.landingDomain.id,
      hostname: order.landingDomain.hostname,
      label: order.landingDomain.label,
    },
    buyer: {
      firstName: order.buyerFirstName,
      lastName: order.buyerLastName,
      email: order.buyerEmail,
      phone: order.buyerPhone,
      country: order.country,
      state: order.state,
      city: order.city,
      address1: order.address1,
      address2: order.address2,
      postalCode: order.postalCode,
    },
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      metadata: formatJson(item.metadata),
      createdAt: item.createdAt.toISOString(),
    })),
    paymentSessions: order.paymentSessions.map((session) => ({
      id: session.id,
      status: session.status,
      amount: Number(session.amount),
      currency: session.currency,
      stripeSessionId: session.stripeSessionId,
      stripePaymentIntentId: session.stripePaymentIntentId,
      stripeAccountId: session.stripeAccountId,
      stripeAccountLabel: session.stripeAccount.accountLabel,
      metadata: formatJson(session.metadata),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    })),
    intakeRequests: order.intakeRequests.map((request) => ({
      id: request.id,
      affiliateCode: request.affiliateCode,
      externalOrderId: request.externalOrderId,
      nonce: request.nonce,
      requestTimestamp: request.requestTimestamp,
      signatureValid: request.signatureValid,
      idempotencyKey: request.idempotencyKey,
      failureReason: request.failureReason,
      requestBody: formatJson(request.requestBody),
      createdAt: request.createdAt.toISOString(),
    })),
    redirectLogs: order.redirectLogs.map((log) => ({
      id: log.id,
      eventType: log.eventType,
      result: log.result,
      status: log.status,
      requestUrl: log.requestUrl,
      message: log.message,
      metadata: formatJson(log.metadata),
      createdAt: log.createdAt.toISOString(),
    })),
    internalNotes,
  };
}

export async function loadAdminOrderDetail(orderId: string) {
  const [order, internalNotes] = await Promise.all([
    loadOrderRecord(orderId),
    loadOrderInternalNotes(orderId),
  ]);

  return mapOrderDetail(order, internalNotes);
}

export async function loadAffiliateOrderDetail(orderId: string, affiliateIds: string[]) {
  const order = await loadOrderRecord(orderId, affiliateIds);
  return mapOrderDetail(order, []);
}

export type OrderDetail = NonNullable<Awaited<ReturnType<typeof loadAdminOrderDetail>>>;
