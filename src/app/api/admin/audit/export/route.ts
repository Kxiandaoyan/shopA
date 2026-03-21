import { NextResponse } from "next/server";
import { normalizeAdminAuditFilters } from "@/lib/admin/audit-filters";
import {
  buildAuditLogExportCsv,
  DEFAULT_AUDIT_EXPORT_LIMIT,
  loadAuditLogExportRows,
} from "@/lib/admin/audit-export";
import { requireSuperAdminApi } from "@/lib/auth/api-access";
import { writeAuditLog } from "@/lib/logging/audit";

export async function GET(request: Request) {
  const auth = await requireSuperAdminApi();

  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const filters = normalizeAdminAuditFilters({
    eventType: searchParams.get("eventType") ?? undefined,
    result: searchParams.get("result") ?? undefined,
    actor: searchParams.get("actor") ?? undefined,
    targetType: searchParams.get("targetType") ?? undefined,
    query: searchParams.get("q") ?? undefined,
  });
  const rows = await loadAuditLogExportRows(filters, DEFAULT_AUDIT_EXPORT_LIMIT);
  const csv = buildAuditLogExportCsv(rows);
  const timestamp = new Date().toISOString().replaceAll(":", "-");

  await writeAuditLog({
    actorId: auth.session.sub,
    eventType: "admin.audit_logs_exported",
    targetType: "audit_log",
    metadata: {
      exportCount: rows.length,
      exportLimit: DEFAULT_AUDIT_EXPORT_LIMIT,
      filters,
    },
  });

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-logs-${timestamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
