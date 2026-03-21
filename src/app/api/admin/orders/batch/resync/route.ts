import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdminApi } from "@/lib/auth/api-access";
import { resyncOrderWithStripe } from "@/lib/stripe/order-resync";
import { writeAuditLog } from "@/lib/logging/audit";

const batchResyncSchema = z.object({
  orderIds: z.array(z.string().trim().min(1)).min(1).max(50),
});

export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const parsed = batchResyncSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "批量同步参数不合法。", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const orderIds = [...new Set(parsed.data.orderIds)];
  const results = [];

  for (const orderId of orderIds) {
    results.push(await resyncOrderWithStripe(orderId, auth.session.sub));
  }

  const successCount = results.filter((item) => item.ok).length;

  await writeAuditLog({
    actorId: auth.session.sub,
    eventType: "admin.order_payment_batch_resync",
    targetType: "order",
    metadata: {
      total: orderIds.length,
      successCount,
      failureCount: orderIds.length - successCount,
      orderIds,
    },
  });

  return NextResponse.json({
    ok: true,
    total: orderIds.length,
    successCount,
    failureCount: orderIds.length - successCount,
    results,
  });
}
