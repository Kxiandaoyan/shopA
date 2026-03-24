import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function requireSuperAdminApi() {
  const session = await getSession();

  if (!session) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, message: "请先登录" }, { status: 401 }),
    };
  }

  if (session.role !== "SUPER_ADMIN") {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, message: "没有权限执行此操作" }, { status: 403 }),
    };
  }

  return {
    ok: true as const,
    session,
  };
}

export async function requireAffiliateAdminApi() {
  const session = await getSession();

  if (!session) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, message: "请先登录" }, { status: 401 }),
    };
  }

  // 检查用户是否有关联的分销商
  if (!session.affiliateIds || session.affiliateIds.length === 0) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, message: "没有权限执行此操作" }, { status: 403 }),
    };
  }

  // 获取第一个关联的分销商信息
  const affiliate = await db.affiliate.findUnique({
    where: { id: session.affiliateIds[0] },
  });

  if (!affiliate) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, message: "分销商信息不存在" }, { status: 403 }),
    };
  }

  return {
    ok: true as const,
    session,
    affiliate,
  };
}
