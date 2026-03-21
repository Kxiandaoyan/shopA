import { LogResult } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdminApi } from "@/lib/auth/api-access";
import { affiliateAdminSchema } from "@/lib/admin/schemas";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/logging/audit";
import { encryptValue } from "@/lib/security/encryption";

const affiliateUpdateSchema = affiliateAdminSchema.extend({
  isActive: z.boolean(),
});

export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const parsed = affiliateAdminSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "参数不合法", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const affiliate = await db.affiliate.upsert({
    where: { code: parsed.data.code },
    update: {
      name: parsed.data.name,
      isActive: true,
      ...(parsed.data.intakeSecret
        ? { intakeSecretEncrypted: encryptValue(parsed.data.intakeSecret) }
        : {}),
      ...(parsed.data.callbackSecret
        ? { callbackSecretEncrypted: encryptValue(parsed.data.callbackSecret) }
        : {}),
    },
    create: {
      code: parsed.data.code,
      name: parsed.data.name,
      intakeSecretEncrypted: parsed.data.intakeSecret
        ? encryptValue(parsed.data.intakeSecret)
        : null,
      callbackSecretEncrypted: parsed.data.callbackSecret
        ? encryptValue(parsed.data.callbackSecret)
        : null,
    },
  });

  await writeAuditLog({
    actorId: auth.session.sub,
    eventType: "admin.affiliate_upserted",
    result: LogResult.SUCCESS,
    targetType: "affiliate",
    targetId: affiliate.id,
    metadata: {
      code: parsed.data.code,
      name: parsed.data.name,
      intakeSecretConfigured: Boolean(parsed.data.intakeSecret),
      callbackSecretConfigured: Boolean(parsed.data.callbackSecret),
    },
  });

  return NextResponse.json({ ok: true, affiliate });
}

export async function PATCH(request: Request) {
  const auth = await requireSuperAdminApi();

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const parsed = affiliateUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "参数不合法", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const affiliate = await db.affiliate.update({
    where: { code: parsed.data.code },
    data: {
      name: parsed.data.name,
      isActive: parsed.data.isActive,
      ...(parsed.data.intakeSecret
        ? { intakeSecretEncrypted: encryptValue(parsed.data.intakeSecret) }
        : {}),
      ...(parsed.data.callbackSecret
        ? { callbackSecretEncrypted: encryptValue(parsed.data.callbackSecret) }
        : {}),
    },
  });

  await writeAuditLog({
    actorId: auth.session.sub,
    eventType: "admin.affiliate_updated",
    result: LogResult.SUCCESS,
    targetType: "affiliate",
    targetId: affiliate.id,
    metadata: {
      code: parsed.data.code,
      name: parsed.data.name,
      isActive: parsed.data.isActive,
      intakeSecretRotated: Boolean(parsed.data.intakeSecret),
      callbackSecretRotated: Boolean(parsed.data.callbackSecret),
    },
  });

  return NextResponse.json({ ok: true, affiliate });
}
