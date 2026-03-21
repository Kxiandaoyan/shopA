import type { AdminOrderAnomalySummary } from "@/lib/admin/orders";

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

  return typeof value === "string" ? value : JSON.stringify(value);
}

export function buildOrderAnomalyExportCsv(rows: AdminOrderAnomalySummary[]) {
  const headers = [
    "orderId",
    "externalOrderId",
    "severity",
    "kind",
    "summary",
    "status",
    "paymentStatus",
    "affiliateName",
    "affiliateCode",
    "domain",
    "createdAt",
  ];

  const lines = rows.map((row) =>
    [
      row.orderId,
      row.externalOrderId,
      row.severity,
      row.kind,
      row.summary,
      row.status,
      row.paymentStatus,
      row.affiliateName,
      row.affiliateCode,
      row.domain,
      row.createdAt,
    ]
      .map((value) => escapeCsvValue(normalizeCsvValue(value)))
      .join(","),
  );

  return [headers.join(","), ...lines].join("\n");
}
