import { LogResult, Prisma } from "@prisma/client";

export type AdminLogFilters = {
  eventType?: string;
  result?: LogResult;
  query?: string;
  orderId?: string;
  domain?: string;
};

export function normalizeAdminLogFilters(input: {
  eventType?: string;
  result?: string;
  query?: string;
  orderId?: string;
  domain?: string;
}): AdminLogFilters {
  const eventType = input.eventType?.trim() || undefined;
  const query = input.query?.trim() || undefined;
  const orderId = input.orderId?.trim() || undefined;
  const domain = input.domain?.trim() || undefined;
  const result =
    input.result && input.result in LogResult ? (input.result as LogResult) : undefined;

  return {
    eventType,
    result,
    query,
    orderId,
    domain,
  };
}

export function buildAdminLogWhere(filters: AdminLogFilters): Prisma.RedirectLogWhereInput {
  const andFilters: Prisma.RedirectLogWhereInput[] = [];

  if (filters.eventType) {
    andFilters.push({
      eventType: {
        contains: filters.eventType,
      },
    });
  }

  if (filters.result) {
    andFilters.push({ result: filters.result });
  }

  if (filters.orderId) {
    andFilters.push({ orderId: filters.orderId });
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
          message: {
            contains: filters.query,
          },
        },
        {
          eventType: {
            contains: filters.query,
          },
        },
        {
          status: {
            contains: filters.query,
          },
        },
      ],
    });
  }

  return andFilters.length > 0 ? { AND: andFilters } : {};
}
