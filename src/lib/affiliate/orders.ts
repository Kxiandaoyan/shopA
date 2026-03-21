import { OrderStatus } from "@prisma/client";
import {
  buildAffiliateOrderWhere,
  type AffiliateOrderFilters,
} from "@/lib/affiliate/order-filters";
import { db } from "@/lib/db";

export async function loadAffiliateOrders(
  affiliateIds: string[],
  filters: AffiliateOrderFilters = {},
  pagination: {
    page?: number;
    pageSize?: number;
  } = {},
) {
  if (affiliateIds.length === 0) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: pagination.pageSize ?? 30,
      totalPages: 1,
    };
  }

  const pageSize = pagination.pageSize ?? 30;
  const page = Math.max(1, pagination.page ?? 1);
  const where = buildAffiliateOrderWhere(affiliateIds, filters);
  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      include: {
        landingDomain: true,
        affiliate: true,
        items: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.order.count({ where }),
  ]);

  return {
    items: orders.map((order) => ({
      id: order.id,
      externalOrderId: order.externalOrderId,
      buyerName: `${order.buyerFirstName} ${order.buyerLastName}`,
      buyerEmail: order.buyerEmail,
      status: order.status,
      amount: Number(order.totalAmount),
      currency: order.currency,
      domain: order.landingDomain.hostname,
      affiliateName: order.affiliate.name,
      createdAt: order.createdAt.toISOString(),
      itemCount: order.items.length,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function loadAffiliateOrderStats(affiliateIds: string[]) {
  if (affiliateIds.length === 0) {
    return {
      total: 0,
      paid: 0,
      failed: 0,
      draft: 0,
      canceled: 0,
    };
  }

  const grouped = await db.order.groupBy({
    by: ["status"],
    where: {
      affiliateId: {
        in: affiliateIds,
      },
    },
    _count: {
      _all: true,
    },
  });

  const lookup = new Map(grouped.map((entry) => [entry.status, entry._count._all]));

  return {
    total: grouped.reduce((sum, entry) => sum + entry._count._all, 0),
    paid: lookup.get(OrderStatus.PAID) ?? 0,
    failed: lookup.get(OrderStatus.FAILED) ?? 0,
    draft: lookup.get(OrderStatus.DRAFT) ?? 0,
    canceled: lookup.get(OrderStatus.CANCELED) ?? 0,
  };
}
