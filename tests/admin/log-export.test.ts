import { LogResult } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { buildRedirectLogExportCsv } from "@/lib/admin/log-export";

describe("buildRedirectLogExportCsv", () => {
  it("escapes commas, quotes and metadata payloads", () => {
    const csv = buildRedirectLogExportCsv([
      {
        id: "log_1",
        createdAt: new Date("2026-03-17T12:00:00.000Z"),
        eventType: "payment.bridge.success",
        result: LogResult.SUCCESS,
        status: "PAID",
        orderCode: "order_1",
        domain: "pay.example.com",
        requestUrl: "https://pay.example.com/payment/success?token=abc",
        message: 'message with "quotes", commas, and more',
        metadata: { hello: "world" },
      },
    ]);

    expect(csv).toContain("id,createdAt,eventType,result,status,orderId,domain,requestUrl,message,metadata");
    expect(csv).toContain('"message with ""quotes"", commas, and more"');
    expect(csv).toContain('"{""hello"":""world""}"');
  });
});
