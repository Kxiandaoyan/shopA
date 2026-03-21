import type { RedirectLog } from "@prisma/client";
import { db } from "@/lib/db";
import { buildAdminLogWhere, type AdminLogFilters } from "@/lib/admin/log-filters";

const DEFAULT_EXPORT_LIMIT = 5000;

type RedirectLogExportRow = Pick<
  RedirectLog,
  "id" | "eventType" | "result" | "status" | "requestUrl" | "message" | "metadata" | "createdAt"
> & {
  orderCode: string | null;
  domain: string | null;
};

function escapeCsvValue(value: string) {
  if (value.includes('"') || value.includes(",") || value.includes("\n") || value.includes("\r")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

function normalizeCsvValue(value: unknown) {
  if (value == null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return JSON.stringify(value);
}

export function buildRedirectLogExportCsv(rows: RedirectLogExportRow[]) {
  const headers = [
    "id",
    "createdAt",
    "eventType",
    "result",
    "status",
    "orderId",
    "domain",
    "requestUrl",
    "message",
    "metadata",
  ];

  const lines = rows.map((row) =>
    [
      row.id,
      row.createdAt.toISOString(),
      row.eventType,
      row.result,
      row.status,
      row.orderCode,
      row.domain,
      row.requestUrl,
      row.message,
      row.metadata,
    ]
      .map((value) => escapeCsvValue(normalizeCsvValue(value)))
      .join(","),
  );

  return [headers.join(","), ...lines].join("\n");
}

export async function loadRedirectLogExportRows(
  filters: AdminLogFilters = {},
  limit = DEFAULT_EXPORT_LIMIT,
) {
  const items = await db.redirectLog.findMany({
    where: buildAdminLogWhere(filters),
    include: {
      order: true,
      landingDomain: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return items.map((item) => ({
    id: item.id,
    createdAt: item.createdAt,
    eventType: item.eventType,
    result: item.result,
    status: item.status,
    orderCode: item.order?.id ?? item.orderId ?? null,
    domain: item.landingDomain?.hostname ?? null,
    requestUrl: item.requestUrl,
    message: item.message,
    metadata: item.metadata,
  }));
}

export { DEFAULT_EXPORT_LIMIT };
