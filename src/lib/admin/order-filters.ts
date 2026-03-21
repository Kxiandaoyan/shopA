import { OrderStatus, Prisma } from "@prisma/client";

const DIRECT_AFFILIATE_CODE = "STORE_DIRECT";

export type AdminOrderSource = "direct" | "affiliate";

export type AdminOrderFilters = {
  orderId?: string;
  externalOrderId?: string;
  affiliate?: string;
  domain?: string;
  buyer?: string;
  status?: OrderStatus;
  source?: AdminOrderSource;
};

export function normalizeAdminOrderFilters(input: {
  orderId?: string;
  externalOrderId?: string;
  affiliate?: string;
  domain?: string;
  buyer?: string;
  status?: string;
  source?: string;
}): AdminOrderFilters {
  const status =
    input.status && input.status in OrderStatus ? (input.status as OrderStatus) : undefined;
  const source =
    input.source === "direct" || input.source === "affiliate"
      ? (input.source as AdminOrderSource)
      : undefined;

  return {
    orderId: input.orderId?.trim() || undefined,
    externalOrderId: input.externalOrderId?.trim() || undefined,
    affiliate: input.affiliate?.trim() || undefined,
    domain: input.domain?.trim() || undefined,
    buyer: input.buyer?.trim() || undefined,
    status,
    source,
  };
}

export function buildAdminOrderWhere(filters: AdminOrderFilters): Prisma.OrderWhereInput {
  const andFilters: Prisma.OrderWhereInput[] = [];

  if (filters.orderId) {
    andFilters.push({
      id: {
        contains: filters.orderId,
      },
    });
  }

  if (filters.externalOrderId) {
    andFilters.push({
      externalOrderId: {
        contains: filters.externalOrderId,
      },
    });
  }

  if (filters.affiliate) {
    andFilters.push({
      affiliate: {
        is: {
          OR: [
            {
              code: {
                contains: filters.affiliate,
              },
            },
            {
              name: {
                contains: filters.affiliate,
              },
            },
          ],
        },
      },
    });
  }

  if (filters.domain) {
    andFilters.push({
      landingDomain: {
        is: {
          hostname: {
            contains: filters.domain,
          },
        },
      },
    });
  }

  if (filters.buyer) {
    andFilters.push({
      OR: [
        {
          buyerEmail: {
            contains: filters.buyer,
          },
        },
        {
          buyerFirstName: {
            contains: filters.buyer,
          },
        },
        {
          buyerLastName: {
            contains: filters.buyer,
          },
        },
        {
          buyerPhone: {
            contains: filters.buyer,
          },
        },
      ],
    });
  }

  if (filters.status) {
    andFilters.push({
      status: filters.status,
    });
  }

  if (filters.source === "direct") {
    andFilters.push({
      affiliate: {
        is: {
          code: DIRECT_AFFILIATE_CODE,
        },
      },
    });
  }

  if (filters.source === "affiliate") {
    andFilters.push({
      NOT: {
        affiliate: {
          is: {
            code: DIRECT_AFFILIATE_CODE,
          },
        },
      },
    });
  }

  return andFilters.length > 0 ? { AND: andFilters } : {};
}
