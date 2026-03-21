import type { AuditLog } from "@prisma/client";
import { db } from "@/lib/db";
import { buildAdminAuditWhere, type AdminAuditFilters } from "@/lib/admin/audit-filters";

const DEFAULT_AUDIT_EXPORT_LIMIT = 5000;

type AuditLogExportRow = Pick<
  AuditLog,
  "id" | "eventType" | "result" | "targetType" | "targetId" | "metadata" | "createdAt"
> & {
  actorEmail: string | null;
  actorName: string | null;
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

export function buildAuditLogExportCsv(rows: AuditLogExportRow[]) {
  const headers = [
    "id",
    "createdAt",
    "eventType",
    "result",
    "actorEmail",
    "actorName",
    "targetType",
    "targetId",
    "metadata",
  ];

  const lines = rows.map((row) =>
    [
      row.id,
      row.createdAt.toISOString(),
      row.eventType,
      row.result,
      row.actorEmail,
      row.actorName,
      row.targetType,
      row.targetId,
      row.metadata,
    ]
      .map((value) => escapeCsvValue(normalizeCsvValue(value)))
      .join(","),
  );

  return [headers.join(","), ...lines].join("\n");
}

export async function loadAuditLogExportRows(
  filters: AdminAuditFilters = {},
  limit = DEFAULT_AUDIT_EXPORT_LIMIT,
) {
  const items = await db.auditLog.findMany({
    where: buildAdminAuditWhere(filters),
    include: {
      actor: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return items.map((item) => ({
    id: item.id,
    createdAt: item.createdAt,
    eventType: item.eventType,
    result: item.result,
    actorEmail: item.actor?.email ?? null,
    actorName: item.actor?.displayName ?? null,
    targetType: item.targetType,
    targetId: item.targetId,
    metadata: item.metadata,
  }));
}

export { DEFAULT_AUDIT_EXPORT_LIMIT };
