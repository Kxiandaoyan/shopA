import { OrderStatus } from "@prisma/client";
import { buildAdminAuditWhere, type AdminAuditFilters } from "@/lib/admin/audit-filters";
import { buildAdminLogWhere, type AdminLogFilters } from "@/lib/admin/log-filters";
import { db } from "@/lib/db";
import {
  normalizeAffiliateCheckoutNameMode,
  type AffiliateCheckoutNameMode,
} from "@/lib/stripe/checkout-name-mode";
import { resolveStorefrontTemplate } from "@/lib/storefront/template-resolver";

const DIRECT_AFFILIATE_CODE = "STORE_DIRECT";

export async function loadAdminAffiliateSummaries() {
  try {
    const affiliates = await db.affiliate.findMany({
      include: {
      domains: {
        include: {
          template: true,
        },
      },
      returnUrls: {
        where: { isActive: true },
      },
      webhookEndpoints: {
        where: { isActive: true },
      },
      },
      orderBy: { createdAt: "desc" },
      take: 24,
    });

    return affiliates.map((affiliate) => ({
      id: affiliate.id,
      code: affiliate.code,
      name: affiliate.name,
      isActive: affiliate.isActive,
      domainCount: affiliate.domains.length,
      returnUrlCount: affiliate.returnUrls.length,
      webhookEndpointCount: affiliate.webhookEndpoints.length,
    }));
  } catch {
    return [];
  }
}

export async function loadAdminUserSummaries() {
  try {
    const users = await db.user.findMany({
      include: {
        memberships: {
          include: {
            affiliate: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      affiliateNames: user.memberships.map((membership) => membership.affiliate.name),
    }));
  } catch {
    return [];
  }
}

export async function loadAdminDomainSummaries() {
  try {
    const domains = await db.landingDomain.findMany({
      include: {
        affiliate: true,
        template: true,
        stripeAccount: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return domains.map((domain) => ({
      id: domain.id,
      hostname: domain.hostname,
      label: domain.label,
      isActive: domain.isActive,
      affiliateId: domain.affiliateId,
      affiliateName: domain.affiliate?.name ?? "未分配",
      templateCode: resolveStorefrontTemplate(domain.template?.templateCode),
      affiliateCheckoutNameMode: normalizeAffiliateCheckoutNameMode(
        domain.affiliateCheckoutNameMode,
      ) as AffiliateCheckoutNameMode,
      affiliateCheckoutFixedName: domain.affiliateCheckoutFixedName,
      stripeAccountId: domain.stripeAccountId,
      stripeLabel: domain.stripeAccount?.accountLabel ?? null,
      stripeActive: domain.stripeAccount?.isActive ?? false,
    }));
  } catch {
    return [];
  }
}

export async function loadAdminReturnUrlSummaries() {
  try {
    const returnUrls = await db.affiliateReturnUrl.findMany({
      include: {
        affiliate: true,
      },
      orderBy: { createdAt: "desc" },
      take: 80,
    });

    return returnUrls.map((entry) => ({
      id: entry.id,
      affiliateName: entry.affiliate.name,
      affiliateId: entry.affiliateId,
      url: entry.url,
      isActive: entry.isActive,
    }));
  } catch {
    return [];
  }
}

export async function loadAdminWebhookEndpointSummaries() {
  try {
    const endpoints = await db.affiliateWebhookEndpoint.findMany({
      include: {
        affiliate: true,
      },
      orderBy: { createdAt: "desc" },
      take: 80,
    });

    return endpoints.map((entry) => ({
      id: entry.id,
      affiliateName: entry.affiliate.name,
      affiliateId: entry.affiliateId,
      url: entry.url,
      isActive: entry.isActive,
    }));
  } catch {
    return [];
  }
}

export async function loadAdminProductSummaries() {
  try {
    const products = await db.product.findMany({
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      category: product.category,
      price: Number(product.price),
      currency: product.currency,
      image: product.image,
      description: product.description,
      features: Array.isArray(product.features) ? (product.features as string[]) : [],
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function loadAdminStripeAccountSummaries() {
  try {
    const accounts = await db.stripeAccount.findMany({
      include: {
        landingDomains: {
          select: {
            id: true,
            hostname: true,
            label: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return accounts.map((account) => ({
      id: account.id,
      accountLabel: account.accountLabel,
      isActive: account.isActive,
      webhookPath: `/api/stripe/webhooks/${account.id}`,
      domainCount: account.landingDomains.length,
      domains: account.landingDomains,
      createdAt: account.createdAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function loadAffiliateDetails(affiliateId: string) {
  try {
    const affiliate = await db.affiliate.findUnique({
      where: { id: affiliateId },
      include: {
        domains: {
          select: {
            id: true,
            hostname: true,
            label: true,
            isActive: true,
          },
        },
        returnUrls: {
          select: {
            id: true,
            url: true,
            isActive: true,
          },
        },
        webhookEndpoints: {
          select: {
            id: true,
            url: true,
            isActive: true,
          },
        },
      },
    });

    if (!affiliate) {
      return null;
    }

    return {
      id: affiliate.id,
      code: affiliate.code,
      name: affiliate.name,
      isActive: affiliate.isActive,
      intakeSecretEncrypted: affiliate.intakeSecretEncrypted,
      callbackSecretEncrypted: affiliate.callbackSecretEncrypted,
      domains: affiliate.domains,
      returnUrls: affiliate.returnUrls,
      webhookEndpoints: affiliate.webhookEndpoints,
    };
  } catch {
    return null;
  }
}

export async function loadAdminLogSummaries(
  filters: AdminLogFilters = {},
  pagination: {
    page?: number;
    pageSize?: number;
  } = {},
) {
  try {
    const pageSize = pagination.pageSize ?? 30;
    const page = Math.max(1, pagination.page ?? 1);
    const where = buildAdminLogWhere(filters);
    const [items, total] = await Promise.all([
      db.redirectLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          order: true,
          landingDomain: true,
        },
      }),
      db.redirectLog.count({ where }),
    ]);

    return {
      items,
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

export async function loadAdminLogStats() {
  try {
    const [total, failures, successes] = await Promise.all([
      db.redirectLog.count(),
      db.redirectLog.count({ where: { result: "FAILURE" } }),
      db.redirectLog.count({ where: { result: "SUCCESS" } }),
    ]);

    return {
      total,
      failures,
      successes,
    };
  } catch {
    return {
      total: 0,
      failures: 0,
      successes: 0,
    };
  }
}

export async function loadAdminAuditSummaries(
  filters: AdminAuditFilters = {},
  pagination: {
    page?: number;
    pageSize?: number;
  } = {},
) {
  try {
    const pageSize = pagination.pageSize ?? 30;
    const page = Math.max(1, pagination.page ?? 1);
    const where = buildAdminAuditWhere(filters);
    const [items, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          actor: true,
        },
      }),
      db.auditLog.count({ where }),
    ]);

    return {
      items,
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

export async function loadAdminAuditStats() {
  try {
    const [total, failures, successes] = await Promise.all([
      db.auditLog.count(),
      db.auditLog.count({ where: { result: "FAILURE" } }),
      db.auditLog.count({ where: { result: "SUCCESS" } }),
    ]);

    return {
      total,
      failures,
      successes,
    };
  } catch {
    return {
      total: 0,
      failures: 0,
      successes: 0,
    };
  }
}

export async function loadAdminDashboardStats() {
  try {
    const [affiliates, domains, products, orders, paid, failed, draft, directOrders] =
      await Promise.all([
        db.affiliate.count(),
        db.landingDomain.count(),
        db.product.count(),
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
      ]);

    return {
      affiliates,
      domains,
      products,
      orders,
      paid,
      failed,
      draft,
      directOrders,
    };
  } catch {
    return {
      affiliates: 0,
      domains: 0,
      products: 0,
      orders: 0,
      paid: 0,
      failed: 0,
      draft: 0,
      directOrders: 0,
    };
  }
}
