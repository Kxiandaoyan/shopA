import { LogResult, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { requireSuperAdminApi } from "@/lib/auth/api-access";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/logging/audit";
import { encryptValue } from "@/lib/security/encryption";
import { hashPassword } from "@/lib/auth/password";

const affiliateCreateSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().trim().min(1).optional(),
  domainIds: z.array(z.string()).optional().default([]),
});

const affiliateUpdateSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(2),
  isActive: z.boolean(),
});

function generateSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const parsed = affiliateCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "参数不合法", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Check if email already exists
  const existingUser = await db.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (existingUser) {
    return NextResponse.json(
      { ok: false, message: "该邮箱已被使用" },
      { status: 400 },
    );
  }

  // Auto-generate code from name
  const baseCode = parsed.data.name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 8);
  const codeSuffix = crypto.randomBytes(2).toString("hex").toUpperCase();
  const code = `${baseCode}_${codeSuffix}`;

  const intakeSecret = generateSecret();
  const callbackSecret = generateSecret();

  // If no domain specified, find any active domain to assign
  let domainIds = parsed.data.domainIds;
  if (domainIds.length === 0) {
    const availableDomain = await db.landingDomain.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
    if (availableDomain) {
      domainIds = [availableDomain.id];
    }
  }

  const displayName = parsed.data.displayName || parsed.data.name;
  const passwordHash = hashPassword(parsed.data.password);

  // Create everything in a transaction
  const result = await db.$transaction(async (tx) => {
    // Create affiliate
    const affiliate = await tx.affiliate.create({
      data: {
        code,
        name: parsed.data.name,
        intakeSecretEncrypted: encryptValue(intakeSecret),
        callbackSecretEncrypted: encryptValue(callbackSecret),
      },
    });

    // Create user with affiliate role
    const user = await tx.user.create({
      data: {
        email: parsed.data.email,
        displayName,
        role: UserRole.AFFILIATE_ADMIN,
        passwordHash,
      },
    });

    // Create membership
    await tx.affiliateMembership.create({
      data: {
        userId: user.id,
        affiliateId: affiliate.id,
      },
    });

    // Create domain assignments
    if (domainIds.length > 0) {
      for (const domainId of domainIds) {
        await tx.affiliateDomain.create({
          data: {
            affiliateId: affiliate.id,
            domainId,
          },
        });
      }
    }

    return { affiliate, user, domainIds };
  });

  await writeAuditLog({
    actorId: auth.session.sub,
    eventType: "admin.affiliate_created",
    result: LogResult.SUCCESS,
    targetType: "affiliate",
    targetId: result.affiliate.id,
    metadata: {
      code: result.affiliate.code,
      name: result.affiliate.name,
      userEmail: result.user.email,
      domainCount: result.domainIds.length,
    },
  });

  return NextResponse.json({
    ok: true,
    affiliate: {
      id: result.affiliate.id,
      code: result.affiliate.code,
      name: result.affiliate.name,
      intakeSecret,
      callbackSecret,
      loginEmail: result.user.email,
      domainCount: result.domainIds.length,
    },
  });
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
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      isActive: parsed.data.isActive,
    },
  });

  await writeAuditLog({
    actorId: auth.session.sub,
    eventType: "admin.affiliate_updated",
    result: LogResult.SUCCESS,
    targetType: "affiliate",
    targetId: affiliate.id,
    metadata: {
      code: affiliate.code,
      name: affiliate.name,
      isActive: parsed.data.isActive,
    },
  });

  return NextResponse.json({ ok: true, affiliate });
}

export async function DELETE(request: Request) {
  const auth = await requireSuperAdminApi();

  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ ok: false, message: "缺少 id 参数" }, { status: 400 });
  }

  // Get affiliate info first
  const affiliate = await db.affiliate.findUnique({
    where: { id },
    include: {
      memberships: true,
      domainAssignments: true,
    },
  });

  if (!affiliate) {
    return NextResponse.json({ ok: false, message: "分销商不存在" }, { status: 404 });
  }

  // Delete everything in a transaction
  await db.$transaction(async (tx) => {
    // Delete domain assignments (cascade will handle this, but being explicit)
    await tx.affiliateDomain.deleteMany({
      where: { affiliateId: id },
    });

    // Delete memberships
    await tx.affiliateMembership.deleteMany({
      where: { affiliateId: id },
    });

    // Delete users that were created for this affiliate
    if (affiliate.memberships.length > 0) {
      await tx.user.deleteMany({
        where: {
          id: { in: affiliate.memberships.map((m) => m.userId) },
          role: UserRole.AFFILIATE_ADMIN,
        },
      });
    }

    // Delete affiliate
    await tx.affiliate.delete({
      where: { id },
    });
  });

  await writeAuditLog({
    actorId: auth.session.sub,
    eventType: "admin.affiliate_deleted",
    result: LogResult.SUCCESS,
    targetType: "affiliate",
    targetId: id,
    metadata: {
      code: affiliate.code,
      name: affiliate.name,
    },
  });

  return NextResponse.json({ ok: true });
}
