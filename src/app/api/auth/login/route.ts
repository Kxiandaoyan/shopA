import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
  };

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ ok: false, message: "请输入邮箱和密码" }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { email },
    include: {
      memberships: {
        include: {
          affiliate: true,
        },
      },
    },
  });

  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ ok: false, message: "邮箱或密码错误" }, { status: 401 });
  }

  const affiliateIds = user.memberships.map((membership) => membership.affiliateId);
  const token = await createSessionToken({
    sub: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    affiliateIds,
  });

  await setSessionCookie(token);

  return NextResponse.json({
    ok: true,
    redirectTo: user.role === "SUPER_ADMIN" ? "/admin" : "/affiliate",
  });
}
