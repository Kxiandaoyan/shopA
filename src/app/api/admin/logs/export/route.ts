import { NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/auth/api-access";
import { buildRedirectLogExportCsv, DEFAULT_EXPORT_LIMIT, loadRedirectLogExportRows } from "@/lib/admin/log-export";
import { normalizeAdminLogFilters } from "@/lib/admin/log-filters";
import { writeAuditLog } from "@/lib/logging/audit";

export async function GET(request: Request) {
  const auth = await requireSuperAdminApi();

  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const filters = normalizeAdminLogFilters({
    eventType: searchParams.get("eventType") ?? undefined,
    result: searchParams.get("result") ?? undefined,
    query: searchParams.get("q") ?? undefined,
    orderId: searchParams.get("orderId") ?? undefined,
    domain: searchParams.get("domain") ?? undefined,
  });
  const rows = await loadRedirectLogExportRows(filters, DEFAULT_EXPORT_LIMIT);
  const csv = buildRedirectLogExportCsv(rows);
  const timestamp = new Date().toISOString().replaceAll(":", "-");

  await writeAuditLog({
    actorId: auth.session.sub,
    eventType: "admin.logs_exported",
    targetType: "redirect_log",
    metadata: {
      exportCount: rows.length,
      exportLimit: DEFAULT_EXPORT_LIMIT,
      filters,
    },
  });

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="redirect-logs-${timestamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
