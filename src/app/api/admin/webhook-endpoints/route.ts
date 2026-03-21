import { LogResult } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdminApi } from "@/lib/auth/api-access";
import { validateActiveAffiliate } from "@/lib/admin/config-validation";
import { webhookEndpointAdminSchema } from "@/lib/admin/schemas";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/logging/audit";

const webhookEndpointUpdateSchema = webhookEndpointAdminSchema.extend({
  id: z.string().min(1),
});

export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const parsed = webhookEndpointAdminSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "参数不合法", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const affiliateValidation = await validateActiveAffiliate(parsed.data.affiliateId);

  if (!affiliateValidation.ok) {
    return NextResponse.json({ ok: false, message: affiliateValidation.message }, { status: 400 });
  }

  const entry = await db.affiliateWebhookEndpoint.upsert({
    where: {
      affiliateId_url: {
        affiliateId: parsed.data.affiliateId,
        url: parsed.data.url,
      },
    },
    update: {
      isActive: parsed.data.isActive,
    },
    create: parsed.data,
  });

  await writeAuditLog({
    actorId: auth.session.sub,
    eventType: "admin.webhook_endpoint_upserted",
    result: LogResult.SUCCESS,
    targetType: "affiliate_webhook_endpoint",
    targetId: entry.id,
    metadata: parsed.data,
  });

  return NextResponse.json({ ok: true, entry });
}

export async function PATCH(request: Request) {
  const auth = await requireSuperAdminApi();

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const parsed = webhookEndpointUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "参数不合法", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const affiliateValidation = await validateActiveAffiliate(parsed.data.affiliateId);

  if (!affiliateValidation.ok) {
    return NextResponse.json({ ok: false, message: affiliateValidation.message }, { status: 400 });
  }

  const entry = await db.affiliateWebhookEndpoint.update({
    where: { id: parsed.data.id },
    data: {
      affiliateId: parsed.data.affiliateId,
      url: parsed.data.url,
      isActive: parsed.data.isActive,
    },
  });

  await writeAuditLog({
    actorId: auth.session.sub,
    eventType: "admin.webhook_endpoint_updated",
    result: LogResult.SUCCESS,
    targetType: "affiliate_webhook_endpoint",
    targetId: entry.id,
    metadata: parsed.data,
  });

  return NextResponse.json({ ok: true, entry });
}
