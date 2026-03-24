import { LogResult } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdminApi } from "@/lib/auth/api-access";
import { stripeAdminSchema } from "@/lib/admin/schemas";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/logging/audit";
import { encryptValue } from "@/lib/security/encryption";

const stripeUpdateSchema = stripeAdminSchema.extend({
  id: z.string().optional(),
});

export async function GET() {
  const auth = await requireSuperAdminApi();

  if (!auth.ok) {
    return auth.response;
  }

  const accounts = await db.stripeAccount.findMany({
    include: {
      landingDomains: {
        select: {
          id: true,
          hostname: true,
          label: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    ok: true,
    accounts: accounts.map((account) => ({
      id: account.id,
      accountLabel: account.accountLabel,
      isActive: account.isActive,
      webhookPath: `/api/stripe/webhooks/${account.id}`,
      domainCount: account.landingDomains.length,
      domains: account.landingDomains,
      createdAt: account.createdAt.toISOString(),
    })),
  });
}

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

  const account = await db.stripeAccount.create({
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
    eventType: "admin.stripe_account_created",
    result: LogResult.SUCCESS,
    targetType: "stripe_account",
    targetId: account.id,
    metadata: {
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

  if (!parsed.data.id) {
    return NextResponse.json({ ok: false, message: "缺少账号 ID" }, { status: 400 });
  }

  const updateData: {
    accountLabel: string;
    publishableKey: string | null;
    isActive: boolean;
    secretKeyEncrypted?: string;
    webhookSecret?: string;
  } = {
    accountLabel: parsed.data.accountLabel,
    publishableKey: parsed.data.publishableKey || null,
    isActive: parsed.data.isActive,
  };

  if (parsed.data.secretKey) {
    updateData.secretKeyEncrypted = encryptValue(parsed.data.secretKey);
  }
  if (parsed.data.webhookSecret) {
    updateData.webhookSecret = encryptValue(parsed.data.webhookSecret);
  }

  const account = await db.stripeAccount.update({
    where: { id: parsed.data.id },
    data: updateData,
  });

  await writeAuditLog({
    actorId: auth.session.sub,
    eventType: "admin.stripe_account_updated",
    result: LogResult.SUCCESS,
    targetType: "stripe_account",
    targetId: account.id,
    metadata: {
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

export async function DELETE(request: Request) {
  const auth = await requireSuperAdminApi();

  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ ok: false, message: "缺少账号 ID" }, { status: 400 });
  }

  const account = await db.stripeAccount.findUnique({
    where: { id },
    include: {
      landingDomains: { select: { hostname: true } },
    },
  });

  if (!account) {
    return NextResponse.json({ ok: false, message: "账号不存在" }, { status: 404 });
  }

  if (account.landingDomains.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        message: `该账号已绑定 ${account.landingDomains.length} 个域名，请先解绑`,
      },
      { status: 400 },
    );
  }

  await db.stripeAccount.delete({ where: { id } });

  await writeAuditLog({
    actorId: auth.session.sub,
    eventType: "admin.stripe_account_deleted",
    result: LogResult.SUCCESS,
    targetType: "stripe_account",
    targetId: id,
    metadata: {
      accountLabel: account.accountLabel,
    },
  });

  return NextResponse.json({ ok: true });
}
