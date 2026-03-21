import { OrderStatus, Prisma } from "@prisma/client";

export type AffiliateOrderFilters = {
  status?: OrderStatus;
  query?: string;
  domain?: string;
};

export function normalizeAffiliateOrderFilters(input: {
  status?: string;
  query?: string;
  domain?: string;
}): AffiliateOrderFilters {
  const normalizedStatus = input.status && input.status in OrderStatus ? (input.status as OrderStatus) : undefined;
  const query = input.query?.trim() || undefined;
  const domain = input.domain?.trim() || undefined;

  return {
    status: normalizedStatus,
    query,
    domain,
  };
}

export function buildAffiliateOrderWhere(
  affiliateIds: string[],
  filters: AffiliateOrderFilters,
): Prisma.OrderWhereInput {
  const andFilters: Prisma.OrderWhereInput[] = [
    {
      affiliateId: {
        in: affiliateIds,
      },
    },
  ];

  if (filters.status) {
    andFilters.push({ status: filters.status });
  }

  if (filters.domain) {
    andFilters.push({
      landingDomain: {
        hostname: {
          contains: filters.domain,
        },
      },
    });
  }

  if (filters.query) {
    andFilters.push({
      OR: [
        {
          externalOrderId: {
            contains: filters.query,
          },
        },
        {
          buyerEmail: {
            contains: filters.query,
          },
        },
        {
          buyerFirstName: {
            contains: filters.query,
          },
        },
        {
          buyerLastName: {
            contains: filters.query,
          },
        },
      ],
    });
  }

  return {
    AND: andFilters,
  };
}
