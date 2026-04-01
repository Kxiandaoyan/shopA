import { LogResult } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdminApi } from "@/lib/auth/api-access";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/logging/audit";
import { encryptValue } from "@/lib/security/encryption";

const stripeCreateSchema = z.object({
  accountLabel: z.string().trim().min(2),
  publishableKey: z.string().trim().optional().nullable(),
  secretKey: z.string().trim().optional().nullable(),
  webhookSecret: z.string().trim().optional().nullable(),
  domainIds: z.array(z.string()).optional().default([]),
  isActive: z.boolean().default(true),
});

const stripeUpdateSchema = stripeCreateSchema.extend({
  id: z.string().min(1),
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
  const parsed = stripeCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "参数不合法", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // 验证域名是否存在且未绑定其他 Stripe 账号
  let domains: { id: string; hostname: string }[] = [];
  if (parsed.data.domainIds.length > 0) {
    const foundDomains = await db.landingDomain.findMany({
      where: {
        id: { in: parsed.data.domainIds },
      },
      select: { id: true, hostname: true, stripeAccountId: true },
    });

    const alreadyBound = foundDomains.filter((d) => d.stripeAccountId);
    if (alreadyBound.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          message: `以下域名已绑定其他 Stripe 账号: ${alreadyBound.map((d) => d.hostname).join(", ")}`,
        },
        { status: 400 },
      );
    }

    domains = foundDomains.map((d) => ({ id: d.id, hostname: d.hostname }));
  }

  const account = await db.stripeAccount.create({
    data: {
      accountLabel: parsed.data.accountLabel,
      publishableKey: parsed.data.publishableKey || null,
      secretKeyEncrypted: parsed.data.secretKey ? encryptValue(parsed.data.secretKey) : null,
      webhookSecret: parsed.data.webhookSecret ? encryptValue(parsed.data.webhookSecret) : null,
      isActive: parsed.data.isActive,
    },
  });

  // 绑定域名
  if (domains.length > 0) {
    await db.landingDomain.updateMany({
      where: { id: { in: domains.map((d) => d.id) } },
      data: { stripeAccountId: account.id },
    });
  }

  await writeAuditLog({
    actorId: auth.session.sub,
    eventType: "admin.stripe_account_created",
    result: LogResult.SUCCESS,
    targetType: "stripe_account",
    targetId: account.id,
    metadata: {
      accountLabel: parsed.data.accountLabel,
      isActive: parsed.data.isActive,
      domainIds: parsed.data.domainIds,
    },
  });

  // 生成完整的 webhook URL
  const webhookUrls = domains.map(
    (d) => `https://${d.hostname}/api/stripe/webhooks/${account.id}`,
  );

  return NextResponse.json({
    ok: true,
    accountId: account.id,
    webhookUrls,
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

  const existing = await db.stripeAccount.findUnique({
    where: { id: parsed.data.id },
    include: {
      landingDomains: {
        select: { id: true, hostname: true },
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ ok: false, message: "账号不存在" }, { status: 404 });
  }

  // 验证新绑定的域名
  const currentDomainIds = new Set(existing.landingDomains.map((d) => d.id));
  const newDomainIds = parsed.data.domainIds.filter((id) => !currentDomainIds.has(id));

  if (newDomainIds.length > 0) {
    const foundDomains = await db.landingDomain.findMany({
      where: {
        id: { in: newDomainIds },
      },
      select: { id: true, hostname: true, stripeAccountId: true },
    });

    const alreadyBound = foundDomains.filter((d) => d.stripeAccountId);
    if (alreadyBound.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          message: `以下域名已绑定其他 Stripe 账号: ${alreadyBound.map((d) => d.hostname).join(", ")}`,
        },
        { status: 400 },
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {
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

  // 更新域名绑定：先解绑不再选择的域名
  const domainsToUnbind = [...currentDomainIds].filter(
    (id) => !parsed.data.domainIds.includes(id),
  );
  const domainsToBind = parsed.data.domainIds.filter((id) => !currentDomainIds.has(id));

  if (domainsToUnbind.length > 0) {
    await db.landingDomain.updateMany({
      where: { id: { in: domainsToUnbind } },
      data: { stripeAccountId: null },
    });
  }

  if (domainsToBind.length > 0) {
    await db.landingDomain.updateMany({
      where: { id: { in: domainsToBind } },
      data: { stripeAccountId: account.id },
    });
  }

  // 获取更新后的域名列表
  const updatedDomains = await db.landingDomain.findMany({
    where: { stripeAccountId: account.id },
    select: { hostname: true },
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
      domainIds: parsed.data.domainIds,
    },
  });

  const webhookUrls = updatedDomains.map(
    (d) => `https://${d.hostname}/api/stripe/webhooks/${account.id}`,
  );

  return NextResponse.json({
    ok: true,
    accountId: account.id,
    webhookUrls,
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
