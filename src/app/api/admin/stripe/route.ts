import { LogResult } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { validateActiveLandingDomain } from "@/lib/admin/config-validation";
import { requireSuperAdminApi } from "@/lib/auth/api-access";
import { stripeAdminSchema } from "@/lib/admin/schemas";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/logging/audit";
import { encryptValue } from "@/lib/security/encryption";

const stripeUpdateSchema = stripeAdminSchema.extend({
  id: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const parsed = stripeAdminSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "参数不合法", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const domainValidation = await validateActiveLandingDomain(parsed.data.landingDomainId);

  if (!domainValidation.ok) {
    return NextResponse.json({ ok: false, message: domainValidation.message }, { status: 400 });
  }

  const account = await db.stripeAccount.upsert({
    where: { landingDomainId: parsed.data.landingDomainId },
    update: {
      accountLabel: parsed.data.accountLabel,
      publishableKey: parsed.data.publishableKey || null,
      secretKeyEncrypted: encryptValue(parsed.data.secretKey),
      webhookSecret: encryptValue(parsed.data.webhookSecret),
      isActive: parsed.data.isActive,
    },
    create: {
      landingDomainId: parsed.data.landingDomainId,
      accountLabel: parsed.data.accountLabel,
      publishableKey: parsed.data.publishableKey || null,
      secretKeyEncrypted: encryptValue(parsed.data.secretKey),
      webhookSecret: encryptValue(parsed.data.webhookSecret),
      isActive: parsed.data.isActive,
    },
  });

  await writeAuditLog({
    actorId: auth.session.sub,
    eventType: "admin.stripe_account_upserted",
    result: LogResult.SUCCESS,
    targetType: "stripe_account",
    targetId: account.id,
    metadata: {
      landingDomainId: parsed.data.landingDomainId,
      accountLabel: parsed.data.accountLabel,
      isActive: parsed.data.isActive,
      webhookPath: `/api/stripe/webhooks/${account.id}`,
    },
  });

  return NextResponse.json({
    ok: true,
    accountId: account.id,
    webhookPath: `/api/stripe/webhooks/${account.id}`,
  });
}

export async function PATCH(request: Request) {
  const auth = await requireSuperAdminApi();

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const parsed = stripeUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "参数不合法", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const domainValidation = await validateActiveLandingDomain(parsed.data.landingDomainId);

  if (!domainValidation.ok) {
    return NextResponse.json({ ok: false, message: domainValidation.message }, { status: 400 });
  }

  const account = await db.stripeAccount.update({
    where: { landingDomainId: parsed.data.landingDomainId },
    data: {
      accountLabel: parsed.data.accountLabel,
      publishableKey: parsed.data.publishableKey || null,
      secretKeyEncrypted: encryptValue(parsed.data.secretKey),
      webhookSecret: encryptValue(parsed.data.webhookSecret),
      isActive: parsed.data.isActive,
    },
  });

  await writeAuditLog({
    actorId: auth.session.sub,
    eventType: "admin.stripe_account_updated",
    result: LogResult.SUCCESS,
    targetType: "stripe_account",
    targetId: account.id,
    metadata: {
      landingDomainId: parsed.data.landingDomainId,
      accountLabel: parsed.data.accountLabel,
      isActive: parsed.data.isActive,
      webhookPath: `/api/stripe/webhooks/${account.id}`,
    },
  });

  return NextResponse.json({
    ok: true,
    accountId: account.id,
    webhookPath: `/api/stripe/webhooks/${account.id}`,
  });
}
