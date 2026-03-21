import { LogResult, Prisma } from "@prisma/client";

export type AdminAuditFilters = {
  eventType?: string;
  result?: LogResult;
  actor?: string;
  targetType?: string;
  query?: string;
};

export function normalizeAdminAuditFilters(input: {
  eventType?: string;
  result?: string;
  actor?: string;
  targetType?: string;
  query?: string;
}): AdminAuditFilters {
  const result =
    input.result && input.result in LogResult ? (input.result as LogResult) : undefined;

  return {
    eventType: input.eventType?.trim() || undefined,
    result,
    actor: input.actor?.trim() || undefined,
    targetType: input.targetType?.trim() || undefined,
    query: input.query?.trim() || undefined,
  };
}

export function buildAdminAuditWhere(filters: AdminAuditFilters): Prisma.AuditLogWhereInput {
  const andFilters: Prisma.AuditLogWhereInput[] = [];

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

  if (filters.actor) {
    andFilters.push({
      OR: [
        {
          actor: {
            is: {
              email: {
                contains: filters.actor,
              },
            },
          },
        },
        {
          actor: {
            is: {
              displayName: {
                contains: filters.actor,
              },
            },
          },
        },
      ],
    });
  }

  if (filters.targetType) {
    andFilters.push({
      targetType: {
        contains: filters.targetType,
      },
    });
  }

  if (filters.query) {
    andFilters.push({
      OR: [
        {
          eventType: {
            contains: filters.query,
          },
        },
        {
          targetType: {
            contains: filters.query,
          },
        },
        {
          targetId: {
            contains: filters.query,
          },
        },
      ],
    });
  }

  return andFilters.length > 0 ? { AND: andFilters } : {};
}
