import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

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
