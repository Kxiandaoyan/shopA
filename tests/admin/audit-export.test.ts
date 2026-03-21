import { LogResult } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { buildAuditLogExportCsv } from "@/lib/admin/audit-export";

describe("buildAuditLogExportCsv", () => {
  it("exports audit rows as escaped csv", () => {
    const csv = buildAuditLogExportCsv([
      {
        id: "audit_1",
        createdAt: new Date("2026-03-17T12:00:00.000Z"),
        eventType: "admin.order_payment_resync",
        result: LogResult.SUCCESS,
        actorEmail: "admin@example.com",
        actorName: "Main Admin",
        targetType: "order",
        targetId: "order_1",
        metadata: { status: "PAID" },
      },
    ]);

    expect(csv).toContain("id,createdAt,eventType,result,actorEmail,actorName,targetType,targetId,metadata");
    expect(csv).toContain("admin@example.com");
    expect(csv).toContain('"{""status"":""PAID""}"');
  });
});
