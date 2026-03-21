import { describe, expect, it } from "vitest";
import { buildOrderAnomalyExportCsv } from "@/lib/admin/order-anomaly-export";

describe("buildOrderAnomalyExportCsv", () => {
  it("exports anomaly rows as csv", () => {
    const csv = buildOrderAnomalyExportCsv([
      {
        orderId: "order_1",
        externalOrderId: "ext_1",
        severity: "high",
        kind: "PAID_WITHOUT_SUCCESSFUL_PAYMENT",
        summary: 'message with "quotes", commas, and more',
        status: "PAID",
        paymentStatus: "CREATED",
        affiliateName: "Affiliate A",
        affiliateCode: "AFF_A",
        domain: "pay.example.com",
        createdAt: "2026-03-18T00:00:00.000Z",
      },
    ]);

    expect(csv).toContain(
      "orderId,externalOrderId,severity,kind,summary,status,paymentStatus,affiliateName,affiliateCode,domain,createdAt",
    );
    expect(csv).toContain('"message with ""quotes"", commas, and more"');
  });
});
