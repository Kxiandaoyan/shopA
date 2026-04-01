import { LogResult } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdminApi } from "@/lib/auth/api-access";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/logging/audit";

const domainCreateSchema = z.object({
  hostname: z.string().trim().min(3),
  label: z.string().trim().min(2),
  affiliateIds: z.array(z.string()).optional().default([]),
  templateCode: z.enum(["A", "B", "C"]).optional().nullable(),
  affiliateCheckoutNameMode: z
    .enum(["FIXED", "CATALOG_RANDOM", "SOURCE_PRODUCT"])
    .default("CATALOG_RANDOM"),
  affiliateCheckoutFixedName: z.string().trim().max(120).optional().nullable(),
  isActive: z.boolean().default(true),
});

const domainUpdateSchema = domainCreateSchema.extend({
  id: z.string().min(1),
});

export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const parsed = domainCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "参数不合法", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // 验证分销商是否存在
  if (parsed.data.affiliateIds.length > 0) {
    const affiliates = await db.affiliate.findMany({
      where: { id: { in: parsed.data.affiliateIds } },
    });
    const validIds = new Set(affiliates.map((a) => a.id));
    const invalidIds = parsed.data.affiliateIds.filter((id) => !validIds.has(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { ok: false, message: `分销商不存在: ${invalidIds.join(", ")}` },
        { status: 400 },
      );
    }
  }

  const domain = await db.landingDomain.upsert({
    where: { hostname: parsed.data.hostname },
    update: {
      label: parsed.data.label,
      affiliateCheckoutNameMode: parsed.data.affiliateCheckoutNameMode,
      affiliateCheckoutFixedName:
        parsed.data.affiliateCheckoutNameMode === "FIXED"
          ? parsed.data.affiliateCheckoutFixedName?.trim() || null
          : null,
      isActive: parsed.data.isActive,
    },
    create: {
      hostname: parsed.data.hostname,
      label: parsed.data.label,
      affiliateCheckoutNameMode: parsed.data.affiliateCheckoutNameMode,
      affiliateCheckoutFixedName:
        parsed.data.affiliateCheckoutNameMode === "FIXED"
          ? parsed.data.affiliateCheckoutFixedName?.trim() || null
          : null,
      isActive: parsed.data.isActive,
    },
  });

  // 管理域名与分销商的关联 - 先删除旧关联，再创建新关联
  await db.affiliateDomain.deleteMany({
    where: { domainId: domain.id },
  });

  if (parsed.data.affiliateIds.length > 0) {
    for (const affiliateId of parsed.data.affiliateIds) {
      await db.affiliateDomain.create({
        data: {
          domainId: domain.id,
          affiliateId,
        },
      });
    }
  }

  if (parsed.data.templateCode) {
    await db.domainTemplate.upsert({
      where: { landingDomainId: domain.id },
      update: {
        templateCode: parsed.data.templateCode,
      },
      create: {
        landingDomainId: domain.id,
        templateCode: parsed.data.templateCode,
      },
    });
  } else {
    await db.domainTemplate.deleteMany({
      where: { landingDomainId: domain.id },
    });
  }

  await writeAuditLog({
    actorId: auth.session.sub,
    eventType: "admin.domain_upserted",
    result: LogResult.SUCCESS,
    targetType: "landing_domain",
    targetId: domain.id,
    metadata: parsed.data,
  });

  return NextResponse.json({ ok: true, domain });
}

export async function PATCH(request: Request) {
  const auth = await requireSuperAdminApi();

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const parsed = domainUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "参数不合法", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // 验证分销商是否存在
  if (parsed.data.affiliateIds.length > 0) {
    const affiliates = await db.affiliate.findMany({
      where: { id: { in: parsed.data.affiliateIds } },
    });
    const validIds = new Set(affiliates.map((a) => a.id));
    const invalidIds = parsed.data.affiliateIds.filter((id) => !validIds.has(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { ok: false, message: `分销商不存在: ${invalidIds.join(", ")}` },
        { status: 400 },
      );
    }
  }

  const domain = await db.landingDomain.update({
    where: { id: parsed.data.id },
    data: {
      hostname: parsed.data.hostname,
      label: parsed.data.label,
      affiliateCheckoutNameMode: parsed.data.affiliateCheckoutNameMode,
      affiliateCheckoutFixedName:
        parsed.data.affiliateCheckoutNameMode === "FIXED"
          ? parsed.data.affiliateCheckoutFixedName?.trim() || null
          : null,
      isActive: parsed.data.isActive,
    },
  });

  // 管理域名与分销商的关联 - 先删除旧关联，再创建新关联
  await db.affiliateDomain.deleteMany({
    where: { domainId: domain.id },
  });

  if (parsed.data.affiliateIds.length > 0) {
    for (const affiliateId of parsed.data.affiliateIds) {
      await db.affiliateDomain.create({
        data: {
          domainId: domain.id,
          affiliateId,
        },
      });
    }
  }

  if (parsed.data.templateCode) {
    await db.domainTemplate.upsert({
      where: { landingDomainId: domain.id },
      update: {
        templateCode: parsed.data.templateCode,
      },
      create: {
        landingDomainId: domain.id,
        templateCode: parsed.data.templateCode,
      },
    });
  } else {
    await db.domainTemplate.deleteMany({
      where: { landingDomainId: domain.id },
    });
  }

  await writeAuditLog({
    actorId: auth.session.sub,
    eventType: "admin.domain_updated",
    result: LogResult.SUCCESS,
    targetType: "landing_domain",
    targetId: domain.id,
    metadata: parsed.data,
  });

  return NextResponse.json({ ok: true, domain });
}
