import { LogResult, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { validateActiveAffiliate } from "@/lib/admin/config-validation";
import { requireSuperAdminApi } from "@/lib/auth/api-access";
import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/logging/audit";

const adminUserSchema = z.object({
  email: z.email(),
  displayName: z.string().trim().min(2),
  password: z.string().min(6),
  role: z.enum([UserRole.SUPER_ADMIN, UserRole.AFFILIATE_ADMIN]),
  affiliateId: z.string().trim().nullable().optional(),
});

export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const parsed = adminUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "参数不合法", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const affiliateId =
    parsed.data.role === UserRole.AFFILIATE_ADMIN ? parsed.data.affiliateId?.trim() ?? null : null;

  if (parsed.data.role === UserRole.AFFILIATE_ADMIN && !affiliateId) {
    return NextResponse.json(
      { ok: false, message: "分销商管理员必须绑定一个分销商" },
      { status: 400 },
    );
  }

  if (affiliateId) {
    const affiliateValidation = await validateActiveAffiliate(affiliateId);

    if (!affiliateValidation.ok) {
      return NextResponse.json(
        { ok: false, message: affiliateValidation.message },
        { status: 400 },
      );
    }
  }

  const selectedAffiliateId = affiliateId ?? undefined;

  const user = await db.$transaction(async (tx) => {
    const savedUser = await tx.user.upsert({
      where: { email: parsed.data.email.toLowerCase() },
      update: {
        displayName: parsed.data.displayName,
        role: parsed.data.role,
        passwordHash: hashPassword(parsed.data.password),
      },
      create: {
        email: parsed.data.email.toLowerCase(),
        displayName: parsed.data.displayName,
        role: parsed.data.role,
        passwordHash: hashPassword(parsed.data.password),
      },
    });

    if (parsed.data.role === UserRole.SUPER_ADMIN) {
      await tx.affiliateMembership.deleteMany({
        where: { userId: savedUser.id },
      });
      return savedUser;
    }

    const requiredAffiliateId = selectedAffiliateId as string;

    await tx.affiliateMembership.deleteMany({
      where: {
        userId: savedUser.id,
        affiliateId: { not: requiredAffiliateId },
      },
    });

    await tx.affiliateMembership.upsert({
      where: {
        userId_affiliateId: {
          userId: savedUser.id,
          affiliateId: requiredAffiliateId,
        },
      },
      update: {},
      create: {
        userId: savedUser.id,
        affiliateId: requiredAffiliateId,
      },
    });

    return savedUser;
  });

  await writeAuditLog({
    actorId: auth.session.sub,
    eventType: "admin.user_upserted",
    result: LogResult.SUCCESS,
    targetType: "user",
    targetId: user.id,
    metadata: {
      email: user.email,
      role: parsed.data.role,
      affiliateId,
    },
  });

  return NextResponse.json({ ok: true, userId: user.id });
}
