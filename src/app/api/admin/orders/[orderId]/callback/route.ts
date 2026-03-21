import { LogResult } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/auth/api-access";
import { deliverAffiliateReturnCallback } from "@/lib/affiliate/callback-delivery";
import { writeAuditLog } from "@/lib/logging/audit";

type CallbackRouteProps = {
  params: Promise<{
    orderId: string;
  }>;
};

export async function POST(_request: Request, { params }: CallbackRouteProps) {
  const auth = await requireSuperAdminApi();

  if (!auth.ok) {
    return auth.response;
  }

  const { orderId } = await params;
  const result = await deliverAffiliateReturnCallback(orderId);

  await writeAuditLog({
    actorId: auth.session.sub,
    eventType: "admin.order_callback_resent",
    result: result.ok ? LogResult.SUCCESS : LogResult.FAILURE,
    targetType: "order",
    targetId: orderId,
    metadata: {
      callbackStatus: result.callbackStatus ?? null,
      responseStatus: result.responseStatus ?? null,
      signed: result.signed ?? null,
      affiliateCode: result.affiliateCode ?? null,
      message: result.message,
    },
  });

  return NextResponse.json(result, {
    status: result.ok ? 200 : 400,
  });
}
