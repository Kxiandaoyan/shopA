import { NextResponse } from "next/server";
import { normalizeAdminOrderAnomalyFilters } from "@/lib/admin/order-anomaly-filters";
import { buildOrderAnomalyExportCsv } from "@/lib/admin/order-anomaly-export";
import { loadAdminOrderAnomalyExportRows } from "@/lib/admin/orders";
import { requireSuperAdminApi } from "@/lib/auth/api-access";
import { writeAuditLog } from "@/lib/logging/audit";

export async function GET(request: Request) {
  const auth = await requireSuperAdminApi();

  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const filters = normalizeAdminOrderAnomalyFilters({
    query: searchParams.get("q") ?? undefined,
    severity: searchParams.get("severity") ?? undefined,
    kind: searchParams.get("kind") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    domain: searchParams.get("domain") ?? undefined,
  });
  const rows = await loadAdminOrderAnomalyExportRows(filters);
  const csv = buildOrderAnomalyExportCsv(rows);
  const timestamp = new Date().toISOString().replaceAll(":", "-");

  await writeAuditLog({
    actorId: auth.session.sub,
    eventType: "admin.order_anomalies_exported",
    targetType: "order",
    metadata: {
      exportCount: rows.length,
      filters,
    },
  });

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"order-anomalies-${timestamp}.csv\"`,
      "Cache-Control": "no-store",
    },
  });
}
