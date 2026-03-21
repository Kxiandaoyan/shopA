import { LogResult, WebhookDispatchMode } from "@prisma/client";
import { NextResponse } from "next/server";
import { deliverAffiliateAsyncWebhooks } from "@/lib/affiliate/async-webhook-delivery";
import { requireSuperAdminApi } from "@/lib/auth/api-access";
import { writeAuditLog } from "@/lib/logging/audit";

type WebhookRouteProps = {
  params: Promise<{
    orderId: string;
  }>;
};

export async function POST(_request: Request, { params }: WebhookRouteProps) {
  const auth = await requireSuperAdminApi();

  if (!auth.ok) {
    return auth.response;
  }

  const { orderId } = await params;
  const result = await deliverAffiliateAsyncWebhooks(orderId, WebhookDispatchMode.MANUAL);

  await writeAuditLog({
    actorId: auth.session.sub,
    eventType: "admin.order_async_webhooks_resent",
    result: result.ok ? LogResult.SUCCESS : LogResult.FAILURE,
    targetType: "order",
    targetId: orderId,
    metadata: {
      callbackStatus: result.callbackStatus ?? null,
      endpointCount: result.endpointCount ?? null,
      deliveredCount: result.ok ? result.deliveredCount : null,
      successCount: result.ok ? result.successCount : null,
      skippedCount: result.ok ? result.skippedCount : null,
      message: result.ok ? null : result.message,
    },
  });

  return NextResponse.json(result, {
    status: result.ok ? 200 : 400,
  });
}
