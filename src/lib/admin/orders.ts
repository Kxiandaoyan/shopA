import { OrderStatus, PaymentStatus } from "@prisma/client";
import type { AdminOrderAnomalyFilters } from "@/lib/admin/order-anomaly-filters";
import { buildAdminOrderWhere, type AdminOrderFilters } from "@/lib/admin/order-filters";
import { db } from "@/lib/db";

const DIRECT_AFFILIATE_CODE = "STORE_DIRECT";
const STALE_ORDER_MINUTES = 30;
const FAILED_ORDER_STATUSES = new Set<OrderStatus>([
  OrderStatus.FAILED,
  OrderStatus.CANCELED,
  OrderStatus.EXPIRED,
]);

type CandidateOrder = Awaited<ReturnType<typeof loadAdminAnomalyCandidates>>[number];

export type AdminOrderAnomalyKind =
  | "STALE_DRAFT"
  | "STALE_CHECKOUT"
  | "CHECKOUT_WITHOUT_PAYMENT_SESSION"
  | "ACTIVE_ORDER_WITHOUT_STRIPE_BINDING"
  | "PAID_WITHOUT_SUCCESSFUL_PAYMENT"
  | "FAILED_WITHOUT_PAYMENT_RECORD";

export type AdminOrderAnomalySummary = {
  orderId: string;
  externalOrderId: string;
  affiliateName: string;
  affiliateCode: string;
  domain: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  severity: "medium" | "high";
  kind: AdminOrderAnomalyKind;
  summary: string;
};

function matchesAnomalyFilters(
  item: AdminOrderAnomalySummary,
  filters: AdminOrderAnomalyFilters,
) {
  if (filters.severity && item.severity !== filters.severity) {
    return false;
  }

  if (filters.kind && item.kind !== filters.kind) {
    return false;
  }

  if (filters.status && item.status !== filters.status) {
    return false;
  }

  if (filters.domain && !item.domain.toLowerCase().includes(filters.domain.toLowerCase())) {
    return false;
  }

  if (filters.query) {
    const query = filters.query.toLowerCase();
    const haystacks = [
      item.orderId,
      item.externalOrderId,
      item.affiliateName,
      item.affiliateCode,
      item.domain,
      item.summary,
      item.kind,
      item.status,
      item.paymentStatus,
    ];

    if (!haystacks.some((value) => value.toLowerCase().includes(query))) {
      return false;
    }
  }

  return true;
}

export function detectOrderAnomalies(order: CandidateOrder, now = new Date()) {
  const anomalies: Array<{
    kind: AdminOrderAnomalyKind;
    severity: "medium" | "high";
    summary: string;
  }> = [];
  const ageMinutes = Math.floor((now.getTime() - order.createdAt.getTime()) / 60000);
  const hasAnyPaymentSession = order.paymentSessions.length > 0;
  const hasSuccessfulPayment = order.paymentSessions.some(
    (session) => session.status === PaymentStatus.SUCCEEDED,
  );
  const hasActiveStripeBinding = Boolean(order.landingDomain.stripeAccount?.isActive);

  if (
    (order.status === OrderStatus.DRAFT || order.status === OrderStatus.LANDING_VISITED) &&
    ageMinutes >= STALE_ORDER_MINUTES
  ) {
    anomalies.push({
      kind: "STALE_DRAFT",
      severity: "medium",
      summary: `订单已停留在 ${order.status} 超过 ${STALE_ORDER_MINUTES} 分钟。`,
    });
  }

  if (order.status === OrderStatus.CHECKOUT_CREATED && ageMinutes >= STALE_ORDER_MINUTES) {
    anomalies.push({
      kind: "STALE_CHECKOUT",
      severity: "high",
      summary: `订单已处于 CHECKOUT_CREATED 超过 ${STALE_ORDER_MINUTES} 分钟。`,
    });
  }

  if (order.status === OrderStatus.CHECKOUT_CREATED && !hasAnyPaymentSession) {
    anomalies.push({
      kind: "CHECKOUT_WITHOUT_PAYMENT_SESSION",
      severity: "high",
      summary: "订单状态已进入结账，但系统里没有对应支付会话记录。",
    });
  }

  if (
    (order.status === OrderStatus.LANDING_VISITED ||
      order.status === OrderStatus.CHECKOUT_CREATED) &&
    !hasActiveStripeBinding
  ) {
    anomalies.push({
      kind: "ACTIVE_ORDER_WITHOUT_STRIPE_BINDING",
      severity: "high",
      summary: "订单需要继续支付，但当前落地域名没有可用 Stripe 绑定。",
    });
  }

  if (order.status === OrderStatus.PAID && !hasSuccessfulPayment) {
    anomalies.push({
      kind: "PAID_WITHOUT_SUCCESSFUL_PAYMENT",
      severity: "high",
      summary: "订单已标记为已支付，但没有成功支付会话记录。",
    });
  }

  if (FAILED_ORDER_STATUSES.has(order.status) && !hasAnyPaymentSession) {
    anomalies.push({
      kind: "FAILED_WITHOUT_PAYMENT_RECORD",
      severity: "medium",
      summary: "订单已结束，但没有任何支付会话记录可供排查。",
    });
  }

  return anomalies;
}

async function loadAdminAnomalyCandidates(limit = 300) {
  return db.order.findMany({
    include: {
      affiliate: true,
      landingDomain: {
        include: {
          stripeAccount: true,
        },
      },
      paymentSessions: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

function buildAnomalySummaries(
  candidates: CandidateOrder[],
  filters: AdminOrderAnomalyFilters = {},
) {
  const now = new Date();

  return candidates
    .flatMap((order) =>
      detectOrderAnomalies(order, now).map((anomaly) => ({
        orderId: order.id,
        externalOrderId: order.externalOrderId,
        affiliateName: order.affiliate.name,
        affiliateCode: order.affiliate.code,
        domain: order.landingDomain.hostname,
        status: order.status,
        paymentStatus: order.paymentSessions[0]?.status ?? PaymentStatus.CREATED,
        createdAt: order.createdAt.toISOString(),
        severity: anomaly.severity,
        kind: anomaly.kind,
        summary: anomaly.summary,
      })),
    )
    .filter((item) => matchesAnomalyFilters(item, filters));
}

export async function loadAdminOrderSummaries(
  filters: AdminOrderFilters = {},
  pagination: {
    page?: number;
    pageSize?: number;
  } = {},
) {
  try {
    const pageSize = pagination.pageSize ?? 30;
    const page = Math.max(1, pagination.page ?? 1);
    const where = buildAdminOrderWhere(filters);
    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        include: {
          affiliate: true,
          landingDomain: true,
          items: true,
          paymentSessions: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.order.count({ where }),
    ]);

    return {
      items: orders.map((order) => {
        const latestPayment = order.paymentSessions[0] ?? null;

        return {
          id: order.id,
          externalOrderId: order.externalOrderId,
          source: order.affiliate.code === DIRECT_AFFILIATE_CODE ? "direct" : "affiliate",
          affiliateName: order.affiliate.name,
          affiliateCode: order.affiliate.code,
          domain: order.landingDomain.hostname,
          status: order.status,
          paymentStatus: latestPayment?.status ?? PaymentStatus.CREATED,
          amount: Number(order.totalAmount),
          currency: order.currency,
          buyerName: `${order.buyerFirstName} ${order.buyerLastName}`.trim(),
          buyerEmail: order.buyerEmail,
          buyerPhone: order.buyerPhone,
          hasReturnUrl: Boolean(order.returnUrl),
          itemCount: order.items.length,
          createdAt: order.createdAt.toISOString(),
        };
      }),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  } catch {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: pagination.pageSize ?? 30,
      totalPages: 1,
    };
  }
}

export async function loadAdminOrderStats() {
  try {
    const [total, paid, failed, pending, direct, affiliate] = await Promise.all([
      db.order.count(),
      db.order.count({ where: { status: OrderStatus.PAID } }),
      db.order.count({ where: { status: OrderStatus.FAILED } }),
      db.order.count({
        where: {
          status: {
            in: [OrderStatus.DRAFT, OrderStatus.LANDING_VISITED, OrderStatus.CHECKOUT_CREATED],
          },
        },
      }),
      db.order.count({
        where: {
          affiliate: {
            is: {
              code: DIRECT_AFFILIATE_CODE,
            },
          },
        },
      }),
      db.order.count({
        where: {
          NOT: {
            affiliate: {
              is: {
                code: DIRECT_AFFILIATE_CODE,
              },
            },
          },
        },
      }),
    ]);

    return {
      total,
      paid,
      failed,
      pending,
      direct,
      affiliate,
    };
  } catch {
    return {
      total: 0,
      paid: 0,
      failed: 0,
      pending: 0,
      direct: 0,
      affiliate: 0,
    };
  }
}

export async function loadAdminOrderAnomalies(filters: AdminOrderAnomalyFilters = {}) {
  try {
    const candidates = await loadAdminAnomalyCandidates();
    const items = buildAnomalySummaries(candidates, filters);
    const counts = items.reduce<Record<AdminOrderAnomalyKind, number>>(
      (accumulator, item) => {
        accumulator[item.kind] += 1;
        return accumulator;
      },
      {
        STALE_DRAFT: 0,
        STALE_CHECKOUT: 0,
        CHECKOUT_WITHOUT_PAYMENT_SESSION: 0,
        ACTIVE_ORDER_WITHOUT_STRIPE_BINDING: 0,
        PAID_WITHOUT_SUCCESSFUL_PAYMENT: 0,
        FAILED_WITHOUT_PAYMENT_RECORD: 0,
      },
    );

    return {
      items,
      counts,
      total: items.length,
    };
  } catch {
    return {
      items: [],
      counts: {
        STALE_DRAFT: 0,
        STALE_CHECKOUT: 0,
        CHECKOUT_WITHOUT_PAYMENT_SESSION: 0,
        ACTIVE_ORDER_WITHOUT_STRIPE_BINDING: 0,
        PAID_WITHOUT_SUCCESSFUL_PAYMENT: 0,
        FAILED_WITHOUT_PAYMENT_RECORD: 0,
      },
      total: 0,
    };
  }
}

export async function loadAdminOrderAnomalyExportRows(filters: AdminOrderAnomalyFilters = {}) {
  const candidates = await loadAdminAnomalyCandidates(1000);
  return buildAnomalySummaries(candidates, filters);
}
