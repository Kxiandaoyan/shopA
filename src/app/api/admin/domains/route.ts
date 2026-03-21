import { LogResult } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdminApi } from "@/lib/auth/api-access";
import { validateActiveAffiliate } from "@/lib/admin/config-validation";
import { domainAdminSchema } from "@/lib/admin/schemas";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/logging/audit";

const domainUpdateSchema = domainAdminSchema.extend({
  id: z.string().min(1),
});

export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const parsed = domainAdminSchema.safeParse(body);

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

  const domain = await db.landingDomain.upsert({
    where: { hostname: parsed.data.hostname },
    update: {
      label: parsed.data.label,
      affiliateId: parsed.data.affiliateId || null,
      isActive: parsed.data.isActive,
    },
    create: {
      hostname: parsed.data.hostname,
      label: parsed.data.label,
      affiliateId: parsed.data.affiliateId || null,
      isActive: parsed.data.isActive,
    },
  });

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

  const affiliateValidation = await validateActiveAffiliate(parsed.data.affiliateId);

  if (!affiliateValidation.ok) {
    return NextResponse.json({ ok: false, message: affiliateValidation.message }, { status: 400 });
  }

  const domain = await db.landingDomain.update({
    where: { id: parsed.data.id },
    data: {
      hostname: parsed.data.hostname,
      label: parsed.data.label,
      affiliateId: parsed.data.affiliateId || null,
      isActive: parsed.data.isActive,
    },
  });

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
